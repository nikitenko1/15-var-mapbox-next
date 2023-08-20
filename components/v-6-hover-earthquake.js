// https://docs.mapbox.com/help/tutorials/create-interactive-hover-effects-with-mapbox-gl-js//
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

// https://earthquake.usgs.gov/fdsnws/event/1/[METHOD[?PARAMETERS]]

const MapHoverEarthquake = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12", // Specify which map style to use
      center: [-100.44121, 37.76132], // Specify the starting position [lng, lat]
      zoom: 4, // Specify the starting zoom
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
  }, []);

  useEffect(() => {
    // starttime: Limit to events on or after the specified start time.
    // NOTE: All times use ISO8601 Date/Time format. Unless a timezone is specified, UTC is assumed.
    const today = new Date();
    // Use JavaScript to get the date a week ago
    const priorDate = new Date().setDate(today.getDate() - 7);
    // Set that to an ISO8601 timestamp as required by the USGS earthquake API
    const priorDateTs = new Date(priorDate);
    const sevenDaysAgo = priorDateTs.toISOString();

    // Target the span elements used in the sidebar
    const magDisplay = document.getElementById("mag");
    const locDisplay = document.getElementById("loc");
    const dateDisplay = document.getElementById("date");

    map.current.on("load", () => {
      // When the map loads, add the data from the USGS earthquake API as a source
      // if the earthquakes already exists on the map, we'll reset it using setData
      if (map.current.getSource("earthquakes")) {
        return;
      }
      map.current.addSource("earthquakes", {
        type: "geojson",
        data: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventtype=earthquake&minmagnitude=1.5&starttime=${sevenDaysAgo}`, // Use the sevenDaysAgo variable to only retrieve quakes from the past week
        generateId: true, // This ensures that all features have unique IDs
      });

      // Add earthquakes as a layer and style it
      map.current.addLayer({
        id: "earthquakes-viz",
        type: "circle",
        source: "earthquakes",
        paint: {
          // The feature-state dependent circle-radius expression will render
          // the radius size according to its magnitude when
          // a feature's hover state is set to true
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            [
              "interpolate",
              ["linear"],
              ["get", "mag"],
              // 1,
              // 8,
              1.5,
              10,
              2,
              12,
              2.5,
              14,
              3,
              16,
              3.5,
              18,
              4.5,
              20,
              6.5,
              22,
              8.5,
              24,
              10.5,
              26,
            ],
            5,
          ],
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,
          // The feature-state dependent circle-color expression will render
          // the color according to its magnitude when
          // a feature's hover state is set to true
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            [
              "interpolate",
              ["linear"],
              ["get", "mag"],
              // 1,
              // "#fff7ec",
              1.5,
              "#fee8c8",
              2,
              "#fdd49e",
              2.5,
              "#fdbb84",
              3,
              "#fc8d59",
              3.5,
              "#ef6548",
              4.5,
              "#d7301f",
              6.5,
              "#b30000",
              8.5,
              "#7f0000",
              10.5,
              "#000",
            ],
            "#000",
          ],
        },
      });

      // "features": [
      //   {
      //     "type": "Feature",
      //     "properties": {
      //       "mag": 5,
      //       "place": "181 km S of Severo-Kuril’sk, Russia",
      //       "time": 1692211427431,
      // ...
      //       "type": "earthquake",
      //       "title": "M 5.0 - 181 km S of Severo-Kuril’sk, Russia"
      //     },
      //     "geometry": {
      //       "type": "Point",
      //       "coordinates": [
      //         156.2412,
      //         49.0429,
      //         37.876
      //       ]
      //     },
      //     "id": "us7000knu9"
      //   },

      let quakeID = null;
      map.current.on("mousemove", "earthquakes-viz", (event) => {
        map.current.getCanvas().style.cursor = "pointer";
        // Set variables equal to the current feature's magnitude, location, and time
        const quakeMagnitude = event.features[0].properties.mag;
        const quakeLocation = event.features[0].properties.place;
        const quakeDate = new Date(event.features[0].properties.time);

        if (event.features.length === 0) return;
        // Display the magnitude, location, and time in the sidebar
        magDisplay.textContent = quakeMagnitude;
        locDisplay.textContent = quakeLocation;
        dateDisplay.textContent = quakeDate;

        // When the mouse moves over the earthquakes-viz layer, update the
        // feature state for the feature under the mouse
        if (quakeID) {
          map.current.removeFeatureState({
            source: "earthquakes",
            id: quakeID,
          });
        }

        quakeID = event.features[0].id;

        map.current.setFeatureState(
          {
            source: "earthquakes",
            id: quakeID,
          },
          {
            hover: true,
          }
        );
      });

      // When the mouse leaves the earthquakes-viz layer, update the
      // feature state of the previously hovered feature
      map.current.on("mouseleave", "earthquakes-viz", () => {
        if (quakeID) {
          map.current.setFeatureState(
            {
              source: "earthquakes",
              id: quakeID,
            },
            {
              hover: false,
            }
          );
        }
        quakeID = null;
        // Remove the information from the previously hovered feature from the sidebar
        magDisplay.textContent = "";
        locDisplay.textContent = "";
        dateDisplay.textContent = "";
        // Reset the cursor style
        map.current.getCanvas().style.cursor = "";
      });
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen" />
      <div
        className="absolute left-5 top-8 max-h-fit w-[30%] border-2 border-blue-600
    bg-slate-100 p-4 text-start"
      >
        <div>
          <strong>Magnitude:</strong> <span id="mag"></span>
        </div>
        <div>
          <strong>Location:</strong> <span id="loc"></span>
        </div>
        <div>
          <strong>Date:</strong> <span id="date"></span>
        </div>
      </div>
    </>
  );
};

export default MapHoverEarthquake;
