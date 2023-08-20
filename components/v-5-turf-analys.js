// https://docs.mapbox.com/help/tutorials/analysis-with-turf/
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
// Alternatively you can import the whole lot using
import * as turf from "@turf/turf";
import { hospitals, libraries } from "@/utils/v-5-turf";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapTurfAnalysis = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-84.5, 38.05], // starting position
      zoom: 12, // starting zoom
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
  }, []);

  useEffect(() => {
    // Add create, update, or delete actions
    map.current.on("load", () => {
      // If a hospitals is already loaded, remove it
      if (map.current.getLayer("hospitals")) {
        return;
      }
      // Add a new layer to the map
      else {
        map.current.addLayer({
          id: "hospitals",
          type: "symbol",
          source: {
            type: "geojson",
            data: hospitals,
          },
          layout: {
            "icon-image": "hospital",
            "icon-allow-overlap": true,
          },
          paint: {},
        });
      }

      // If a libraries is already loaded, remove it
      if (map.current.getLayer("libraries")) {
        return;
      }
      // Add a new layer to the map
      else {
        map.current.addLayer({
          id: "libraries",
          type: "symbol",
          source: {
            type: "geojson",
            data: libraries,
          },
          layout: {
            "icon-image": "library",
          },
          paint: {},
        });
      }
      // if the nearest-hospital already exists on the map, we'll reset it using setData
      if (map.current.getSource("nearest-hospital")) {
        return;
      }
      // otherwise, we'll make a new request
      else {
        map.current.addSource("nearest-hospital", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      const popup = new mapboxgl.Popup();

      map.current.on("mousemove", (event) => {
        const features = map.current.queryRenderedFeatures(event.point, {
          layers: ["hospitals", "libraries"],
        });
        if (!features.length) {
          popup.remove();
          return;
        }
        const feature = features[0];

        popup
          .setLngLat(feature.geometry.coordinates)
          .setHTML(feature.properties.Name)
          .addTo(map.current);

        map.current.getCanvas().style.cursor = features.length ? "pointer" : "";
      });

      map.current.on("click", (event) => {
        const libraryFeatures = map.current.queryRenderedFeatures(event.point, {
          layers: ["libraries"],
        });
        if (!libraryFeatures.length) {
          return;
        }

        const libraryFeature = libraryFeatures[0];

        const nearestHospital = turf.nearest(libraryFeature, hospitals);

        if (nearestHospital === null) return;
        map.current.getSource("nearest-hospital").setData({
          type: "FeatureCollection",
          features: [nearestHospital],
        });

        if (map.current.getLayer("nearest-hospital")) {
          map.current.removeLayer("nearest-hospital");
        }

        map.current.addLayer(
          {
            id: "nearest-hospital",
            type: "circle",
            source: "nearest-hospital",
            paint: {
              "circle-radius": 12,
              "circle-color": "#486DE0",
            },
          },
          "hospitals"
        );
      });
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen" />
    </>
  );
};

export default MapTurfAnalysis;
