// https://docs.mapbox.com/help/tutorials/getting-started-directions-api/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapDirectionsAPI = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  const [zoom] = useState(12);

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [30.540297, 50.442771], // starting position
      zoom: zoom,
    });
    //
    map.current.on("load", () => {
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
      map.current.addControl(new mapboxgl.FullscreenControl());

      // set the bounds of the map
      const bounds = [
        [30.529434, 50.435619],
        [30.550857, 50.453392],
      ];
      map.current.setMaxBounds(bounds);
    });
  }, []);

  // "routes": [
  //   {
  //     ...
  //     "geometry": {
  //       "coordinates": [
  //         [...

  // an arbitrary start will always be the same
  // only the end or destination will change
  const start = [30.540297, 50.442771];

  // create a function to make a directions request
  const getRoute = async (end) => {
    // make a directions request using cycling profile
    // an arbitrary start will always be the same
    // only the end or destination will change
    const res = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${token}`
    );

    const data = res.data.routes[0];
    console.log(data);
    const route = data.geometry.coordinates;
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };
    // if the route already exists on the map, we'll reset it using setData
    if (map.current.getSource("route")) {
      map.current.getSource("route").setData(geojson);
    }
    // otherwise, we'll make a new request
    else {
      map.current.addLayer({
        id: "route",
        type: "line",
        source: {
          type: "geojson",
          data: geojson,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3887be",
          "line-width": 5,
          "line-opacity": 0.75,
        },
      });
    }

    // get the sidebar and add the instructions
    const instructions = document.getElementById("instructions");
    const steps = data.legs[0].steps;

    let tripInstructions = "";
    for (const step of steps) {
      tripInstructions += `<li>${step.maneuver.instruction}</li>`;
    }
    instructions.innerHTML = `<p><strong>Trip duration: ${Math.floor(
      data.duration / 60
    )} min 🚴 </strong></p><ol>${tripInstructions}</ol>`;
  };

  useEffect(() => {
    // make an initial directions request that
    // starts and ends at the same location
    start !== "" && getRoute(start);
  }, [start]);

  // this is where the code for the next step will go

  useEffect(() => {
    map.current.on("load", () => {
      // Add starting point to the map
      map.current.addLayer({
        id: "point",
        type: "circle",
        source: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: start,
                },
              },
            ],
          },
        },
        paint: {
          "circle-radius": 10,
          "circle-color": "#3887be",
        },
      });
    });
  }, []);

  // this is where the code from the next step will go

  useEffect(() => {
    map.current.on("click", (event) => {
      const coords = Object.keys(event.lngLat).map((key) => event.lngLat[key]);
      const end = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: coords,
            },
          },
        ],
      };
      if (map.current.getLayer("end")) {
        map.current.getSource("end").setData(end);
      } else {
        map.current.addLayer({
          id: "end",
          type: "circle",
          source: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "Point",
                    coordinates: coords,
                  },
                },
              ],
            },
          },
          paint: {
            "circle-radius": 10,
            "circle-color": "#f30",
          },
        });
      }
      getRoute(coords);
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative">
        <div
          className="absolute m-5 p-5 w-[25%] top-0 bottom-[20%] bg-slate-200 overflow-y-scroll
          z-10"
          id="instructions"
        ></div>
      </div>
    </>
  );
};

export default MapDirectionsAPI;
