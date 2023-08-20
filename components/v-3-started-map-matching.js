// https://docs.mapbox.com/help/tutorials/get-started-map-matching-api/?size=n_10_n
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapMatchingAPI = () => {
  // {
  //     "matchings": [{
  //       "confidence": 4.615758886217236e-10,
  //       "geometry": {
  //         "coordinates": [
  //           [
  //             -122.397484,
  //             37.792809
  //           ],

  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [30.540297, 50.442771], // starting position
      zoom: 13,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      // Select which mapbox-gl-draw control buttons to add to the map.
      controls: {
        line_string: true,
        trash: true,
      },
      // Set the draw mode to draw LineStrings by default.
      defaultMode: "draw_line_string",
      styles: [
        // Set the line style for the user-input coordinates.
        {
          id: "gl-draw-line",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#438EE4",
            "line-dasharray": [0.2, 2],
            "line-width": 4,
            "line-opacity": 0.7,
          },
        },
        // Style the vertex point halos.
        {
          id: "gl-draw-polygon-and-line-vertex-halo-active",
          type: "circle",
          filter: [
            "all",
            ["==", "meta", "vertex"],
            ["==", "$type", "Point"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "circle-radius": 12,
            "circle-color": "#FFF",
          },
        },
        // Style the vertex points.
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          filter: [
            "all",
            ["==", "meta", "vertex"],
            ["==", "$type", "Point"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "circle-radius": 8,
            "circle-color": "#438EE4",
          },
        },
      ],
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
    // Add the draw tool to the map

    map.current.addControl(draw);

    // set the bounds of the map
    const bounds = [
      [30.529434, 50.435619],
      [30.550857, 50.453392],
    ];
    map.current.setMaxBounds(bounds);

    // If the user clicks the delete draw button, remove the layer if it exists
    function removeRoute() {
      if (!map.current.getSource("route")) return;
      map.current.removeLayer("route");
      map.current.removeSource("route");
    }

    function updateRoute() {
      removeRoute(); // Overwrite any existing layers
      // Set the profile
      const profile = "driving";
      // Get the coordinates that were drawn on the map
      const data = draw.getAll();
      console.log(data.features);
      const lastFeature = data.features.length === 1 ? 0 : data.features.length - 1;
      const coords = data.features[lastFeature].geometry.coordinates;
      // Format the coordinates
      const newCoords = coords.join(";");

      // Set the radius for each coordinate pair to 25 meters
      const radius = coords.map(() => 25);
      if (data.features[lastFeature].geometry.coordinates < 2) return;
      getMatch(newCoords, radius, profile);
    }

    // Draw the Map Matching route as a new layer on the map
    function addRoute(coords) {
      // If a route is already loaded, remove it
      if (map.current.getSource("route")) {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      } else {
        // Add a new layer to the map
        map.current.addLayer({
          id: "route",
          type: "line",
          source: {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: coords,
            },
          },
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#03AA46",
            "line-width": 8,
            "line-opacity": 0.8,
          },
        });
      }
    }

    function getInstructions(data) {
      // Target the sidebar to add the instructions
      const directions = document.getElementById("directions");
      let tripDirections = "";
      // Output the instructions for each step of each leg in the response object
      for (const leg of data.legs) {
        const steps = leg.steps;
        for (const step of steps) {
          tripDirections += `<li>${step.maneuver.instruction}</li>`;
        }
      }
      directions.innerHTML = `<p><strong>Trip duration: ${Math.floor(
        data.duration / 60
      )} min.</strong></p><ol>${tripDirections}</ol>`;
    }

    // Use the coordinates you drew to make the Map Matching API request
    // Make a Map Matching request
    // Make a Map Matching request
    async function getMatch(coordinates, radius, profile) {
      // Separate the radiuses with semicolons
      const radiuses = radius.join(";");
      // Create the query
      const query = await fetch(
        `https://api.mapbox.com/matching/v5/mapbox/${profile}/${coordinates}?geometries=geojson&radiuses=${radiuses}&steps=true&access_token=${token}`,
        { method: "GET" }
      );
      const response = await query.json();
      // Handle errors
      if (response.code !== "Ok") {
        alert(
          `${response.code} - ${response.message}.\n\nFor more information: https://docs.mapbox.com/api/navigation/map-matching/#map-matching-api-errors`
        );
        return;
      }
      const coords = response.matchings[0].geometry;
      // Draw the route on the map
      addRoute(coords);
      getInstructions(response.matchings[0]);
    }
    // Add create, update, or delete actions
    map.current.on("load", () => {
      map.current.on("draw.create", updateRoute);
      map.current.on("draw.update", updateRoute);
      map.current.on("draw.delete", removeRoute);
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div
        className="absolute m-5 p-5 w-[25%] top-0 bottom-5 bg-slate-200 overflow-y-scroll
          z-10"
      >
        <p className="font-semibold text-sm tracking-wider">
          Draw your route using the draw tools on the right. To get the most accurate route match,
          draw points at regular intervals.
        </p>

        <div
          id="directions"
          className="text-amber-800 bg-amber-100 text-base mt-8
        p-4"
        ></div>
      </div>
    </>
  );
};

export default MapMatchingAPI;
