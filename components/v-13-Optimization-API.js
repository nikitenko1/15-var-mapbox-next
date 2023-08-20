// https://docs.mapbox.com/help/tutorials/optimization-api/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
// Alternatively you can import the whole lot using
import * as turf from "@turf/turf";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapOptimizationAPI = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(30.540297);
  const [lat, setLat] = useState(50.442771);
  const [zoom, setZoom] = useState(12);

  const truckLocation = [30.6322484263821, 50.45564235];
  const warehouseLocation = [30.6103610833638, 50.44518495];
  const lastAtRestaurant = 0;
  let keepTrack = [];
  const pointHopper = {};

  // The following code will be invoked right after the app is inserted into the DOM tree of your HTML pages
  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current, // initialize map only once
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: zoom,
      scrollZoom: false,
    });
    //
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
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

  // Create a GeoJSON feature collection for the warehouse
  const warehouse = turf.featureCollection([turf.point(warehouseLocation)]);
  // Create an empty GeoJSON feature collection for drop-off locations
  const dropoffs = turf.featureCollection([]);
  // Create an empty GeoJSON feature collection, which will be used as the data source for the route
  // before users add any new data
  const nothing = turf.featureCollection([]);

  useEffect(() => {
    // After the map style has loaded on the page,
    map.current.on("load", async () => {
      const marker = document.createElement("div");
      marker.classList = "truck";
      // Create a new marker
      new mapboxgl.Marker(marker).setLngLat(truckLocation).addTo(map.current);

      // Create an empty GeoJSON feature collection for drop-off locations
      const dropoffs = turf.featureCollection([]);

      // Create a circle layer
      !map.current.getLayer("warehouse") &&
        map.current.addLayer({
          id: "warehouse",
          type: "circle",
          source: {
            data: warehouse,
            type: "geojson",
          },
          paint: {
            "circle-radius": 20,
            "circle-color": "white",
            "circle-stroke-color": "#3887be",
            "circle-stroke-width": 3,
          },
        });

      !map.current.getSource("route") &&
        map.current.addSource("route", {
          type: "geojson",
          data: nothing,
        });

      !map.current.getLayer("routeline-active") &&
        map.current.addLayer(
          {
            id: "routeline-active",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#3887be",
              "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 22, 12],
            },
          },
          "waterway-label"
        );

      // Create a symbol layer on top of circle layer
      !map.current.getLayer("warehouse-symbol") &&
        map.current.addLayer({
          id: "warehouse-symbol",
          type: "symbol",
          source: {
            data: warehouse,
            type: "geojson",
          },
          layout: {
            "icon-image": "grocery-15",
            "icon-size": 1,
          },
          paint: {
            "text-color": "#3887be",
          },
        });
      !map.current.getLayer("dropoffs-symbol") &&
        map.current.addLayer({
          id: "dropoffs-symbol",
          type: "symbol",
          source: {
            data: dropoffs,
            type: "geojson",
          },
          layout: {
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-image": "marker-15",
          },
        });
      !map.current.getLayer("routearrows") &&
        map.current.addLayer(
          {
            id: "routearrows",
            type: "symbol",
            source: "route",
            layout: {
              "symbol-placement": "line",
              "text-field": "▶",
              "text-size": ["interpolate", ["linear"], ["zoom"], 12, 24, 22, 60],
              "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 12, 30, 22, 160],
              "text-keep-upright": false,
            },
            paint: {
              "text-color": "#3887be",
              "text-halo-color": "hsl(55, 11%, 96%)",
              "text-halo-width": 3,
            },
          },
          "waterway-label"
        );

      // Listen for a click on the map
      await map.current.on("click", addWaypoints);

      async function addWaypoints(event) {
        // When the map is clicked, add a new drop off point
        // and update the `dropoffs-symbol` layer
        await newDropoff(map.current.unproject(event.point));
        updateDropoffs(dropoffs);
      }

      async function newDropoff(coordinates) {
        // Store the clicked point as a new GeoJSON feature with
        // two properties: `orderTime` and `key`
        const pt = turf.point([coordinates.lng, coordinates.lat], {
          orderTime: Date.now(),
          key: Math.random(),
        });
        dropoffs.features.push(pt);
        pointHopper[pt.properties.key] = pt;
        // Make a request to the Optimization API
        const query = await fetch(assembleQueryURL(), { method: "GET" });
        const response = await query.json();
        if (response.code !== "Ok") {
          const handleMessage =
            response.code === "InvalidInput"
              ? "Refresh to start a new route. For more information: https://docs.mapbox.com/api/navigation/optimization/#optimization-api-errors"
              : "Try a different point.";
          alert(`${response.code} - ${response.message}\n\n${handleMessage}`);
          // Remove invalid point
          dropoffs.features.pop();
          delete pointHopper[pt.properties.key];
          return;
        }
        // Create a GeoJSON feature collection
        const routeGeoJSON = turf.featureCollection([turf.feature(response.trips[0].geometry)]);

        // Update the `route` source by getting the route source
        // and setting the data equal to routeGeoJSON
        map.current.getSource("route").setData(routeGeoJSON);
      }

      function updateDropoffs(geojson) {
        map.current.getSource("dropoffs-symbol").setData(geojson);
      }

      // Here you'll specify all the parameters necessary for requesting a response from the Optimization API
      function assembleQueryURL() {
        // Store the location of the truck in a constant called coordinates
        const coordinates = [truckLocation];
        const distributions = [];
        keepTrack = [truckLocation];

        // Create an array of GeoJSON feature collections for each point
        const restJobs = Object.keys(pointHopper).map((key) => pointHopper[key]);

        // If there are any orders from this restaurant
        if (restJobs.length > 0) {
          // Check to see if the request was made after visiting the restaurant
          const needToPickUp =
            restJobs.filter((d) => {
              return d.properties.orderTime > lastAtRestaurant;
            }).length > 0;

          // If the request was made after picking up from the restaurant,
          // Add the restaurant as an additional stop
          const restaurantIndex = coordinates.length;
          if (needToPickUp) {
            // Add the restaurant as a coordinate
            coordinates.push(warehouseLocation);
            // push the restaurant itself into the array
            keepTrack.push(pointHopper.warehouse);
          }

          for (const job of restJobs) {
            // Add dropoff to list
            keepTrack.push(job);
            coordinates.push(job.geometry.coordinates);
            // if order not yet picked up, add a reroute
            if (needToPickUp && job.properties.orderTime > lastAtRestaurant) {
              distributions.push(`${restaurantIndex},${coordinates.length - 1}`);
            }
          }
        }

        // Set the profile to `driving`
        // Coordinates will include the current location of the truck,
        return `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.join(
          ";"
        )}?distributions=${distributions.join(
          ";"
        )}&overview=full&steps=true&geometries=geojson&source=first&access_token=${
          mapboxgl.accessToken
        }`;
      }
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative overflow-auto" />
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
    </>
  );
};

export default MapOptimizationAPI;
