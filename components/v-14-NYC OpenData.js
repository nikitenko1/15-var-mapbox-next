// https://docs.mapbox.com/help/tutorials/show-changes-over-time/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
import { geojson } from "@/utils/v-14-NYC";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapChangesOverTime = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(-74.0059);
  const [lat, setLat] = useState(40.7128);
  const [zoom, setZoom] = useState(12);
  //
  const [slider, setSlider] = useState(12);
  const [topping, setTopping] = useState("all");
  //
  const onOptionChange = (e) => {
    setTopping(e.target.value);
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11", // The map style to use
      center: [-74.0059, 40.7128], // Starting position [lng, lat]
      zoom: zoom, // Starting zoom level
    });
    //
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());

    // After the map style has loaded on the page,
    map.current.on("load", () => {
      // Combining filters
      let filterHour = ["==", ["number", ["get", "Hour"]], 12];
      let filterDay = ["!=", ["string", ["get", "Day"]], "placeholder"];

      map.current.addLayer({
        id: "collisions",
        type: "circle",
        source: {
          type: "geojson",
          data: geojson, // replace this with the url of your own geojson
        },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["number", ["get", "Casualty"]],
            0,
            4,
            5,
            24,
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["number", ["get", "Casualty"]],
            0,
            "#2DC4B2",
            1,
            "#3BB3C3",
            2,
            "#669EC4",
            3,
            "#8B88B6",
            4,
            "#A2719B",
            5,
            "#AA5E79",
          ],
          "circle-opacity": 0.8,
        },
        // Add a map filter
        filter: ["all", filterHour, filterDay],
      });

      document.getElementById("slider").addEventListener("input", (event) => {
        const hour = parseInt(event.target.value);
        // update the map
        map.current.setFilter("collisions", ["==", ["number", ["get", "Hour"]], hour]);

        // converting 0-23 hour to AMPM format
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 ? hour % 12 : 12;

        // update text in the UI
        document.getElementById("active-hour").innerText = hour12 + ampm;
      });

      document.getElementById("filters").addEventListener("change", (event) => {
        const day = event.target.value;
        // update the map filter
        if (day === "all") {
          filterDay = ["!=", ["string", ["get", "Day"]], "placeholder"];
        } else if (day === "weekday") {
          filterDay = ["match", ["get", "Day"], ["Sat", "Sun"], false, true];
        } else if (day === "weekend") {
          filterDay = ["match", ["get", "Day"], ["Sat", "Sun"], true, false];
        } else {
          console.log("error");
        }
        map.current.setFilter("collisions", ["all", filterDay]);
      });
    });
  }, []);

  useEffect(() => {
    // After the map style has loaded on the page,
    map.current.on("load", () => {
      map.current.on("move", () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div
        id="console"
        className="absolute left-5 top-8 max-h-fit w-[30%] border-2 border-blue-600
    bg-slate-100 p-4 text-start"
      >
        <h1 className="leading-8 text-xl">Motor vehicle collisions</h1>
        <p>
          Data:{" "}
          <Link
            href="https://data.cityofnewyork.us/Public-Safety/NYPD-Motor-Vehicle-Collisions/h9gi-nx95"
            className="no-underline text-blue-700 font-semibold"
          >
            Motor vehicle collision injuries and deaths
          </Link>{" "}
          in NYC, Jan 2016
        </p>
        <div className="session">
          <h2 mb-3 leading-5 text-sm>
            Casualty
          </h2>
          <div className="row colors"></div>
          <div className="row labels">
            <div className="label">0</div>
            <div className="label">1</div>
            <div className="label">2</div>
            <div className="label">3</div>
            <div className="label">4</div>
            <div className="label">5+</div>
          </div>
        </div>
        <div className="session">
          <h2 mb-3 leading-5 text-sm>
            Hour: <label id="active-hour">12PM</label>
          </h2>
          <input
            id="slider"
            className="row"
            type="range"
            min="0"
            max="23"
            step="1"
            onChange={(e) => setSlider(e.target.value)}
            value={slider}
          />
        </div>
        <div className="session">
          <h2 className="mb-3 leading-5 text-sm">Day of the week</h2>
          <div className="w-full h-3 flex justify-start gap-1 items-center" id="filters">
            <input
              id="all"
              type="radio"
              name="toggle"
              value="all"
              checked={topping === "all"}
              onChange={onOptionChange}
            />
            <label htmlFor="all">All</label>
            <input
              id="weekday"
              type="radio"
              name="toggle"
              value="weekday"
              checked={topping === "weekday"}
              onChange={onOptionChange}
            />
            <label htmlFor="weekday">Weekday</label>
            <input
              id="weekend"
              type="radio"
              name="toggle"
              value="weekend"
              checked={topping === "weekend"}
              onChange={onOptionChange}
            />
            <label htmlFor="weekend">Weekend</label>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapChangesOverTime;
