// https://docs.mapbox.com/help/tutorials/point-in-polygon-query-with-mapbox-boundaries/
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
// Alternatively you can import the whole lot using
import * as turf from "@turf/turf";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const DrawPolygonCalculate = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/street-v12", // stylesheet location
      center: [30.540297, 50.442771], // starting position
      zoom: 13, // starting zoom
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      // Select which mapbox-gl-draw control buttons to add to the map.
      controls: {
        polygon: true,
        trash: true,
      },
      // Set mapbox-gl-draw to draw by default.
      // The user does not have to click the polygon control button first.
      defaultMode: "draw_polygon",
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
    // Add the draw tool to the map
    map.current.addControl(draw);

    // set the bounds of the map
    const bounds = [
      [29.26325, 49.187752],
      [32.178986, 51.564295],
    ];
    map.current.setMaxBounds(bounds);

    function updateArea(e) {
      const data = draw.getAll();
      const answer = document.getElementById("calculated-area");
      if (data.features.length > 0) {
        const area = turf.area(data);
        // Restrict the area to 2 decimal points.
        const rounded_area = Math.round(area * 100) / 100;
        answer.innerHTML = `<p><strong>${rounded_area}</strong></p><p>square meters</p>`;
      } else {
        answer.innerHTML = "";
        if (e.type !== "draw.delete") alert("Click the map to draw a polygon.");
      }
    }
    // Add create, update, or delete actions

    map.current.on("draw.create", updateArea);
    map.current.on("draw.delete", updateArea);
    map.current.on("draw.update", updateArea);
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div
        className="absolute left-5 top-8 max-h-fit w-24 border-2 border-blue-600
    bg-slate-100 p-4 text-center"
      >
        <p className="font-semibold">Click the map to draw a polygon.</p>
        <div id="calculated-area" />
      </div>
    </>
  );
};

export default DrawPolygonCalculate;
