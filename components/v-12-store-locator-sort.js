// https://docs.mapbox.com/help/tutorials/geocode-and-sort-stores/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { stores } from "@/utils/v-11-store";
// Alternatively you can import the whole lot using
import * as turf from "@turf/turf";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapSortStoresDistance = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(-77.034084);
  const [lat, setLat] = useState(38.909671);
  const [zoom, setZoom] = useState(12);

  /* Assign a unique ID to each store */
  stores.features.forEach(function (store, i) {
    store.properties.id = i;
  });

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

    // After the map style has loaded on the page,
    map.current.on("load", () => {
      /**
       * This is where your '.addLayer()' used to be, instead
       * add only the source without styling a layer
       */
      !map.current.getSource("places") &&
        map.current.addSource("places", {
          type: "geojson",
          data: stores,
        });

      /**
       * Create a new MapboxGeocoder instance.
       */
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: true,
        placeholder: "Enter an address...", // This placeholder text will display in the search bar
        bbox: [-77.210763, 38.803367, -76.853675, 39.052643],
      });

      /**
       * Add all the things to the page:
       * - The location listings on the side of the page
       * - The search box (MapboxGeocoder) onto the map
       * - The markers onto the map
       */
      buildLocationList(stores);
      map.current.addControl(geocoder, "top-right");
      addMarkers();

      /**
       * Listen for when a geocoder result is returned. When one is returned:
       * - Calculate distances
       * - Sort stores by distance
       * - Rebuild the listings
       * - Adjust the map camera
       * - Open a popup for the closest store
       * - Highlight the listing for the closest store.
       */
      geocoder.on("result", (event) => {
        /* Get the coordinate of the search result */
        const searchResult = event.result.geometry;

        /**
         * Calculate distances:
         * For each store, use turf.disance to calculate the distance
         * in miles between the searchResult and the store. Assign the
         * calculated value to a property called `distance`.
         */
        const options = { units: "miles" };
        for (const store of stores.features) {
          store.properties.distance = turf.distance(searchResult, store.geometry, options);
        }

        /**
         * Sort stores by distance from closest to the `searchResult`
         * to furthest.
         */
        stores.features.sort((a, b) => {
          if (a.properties.distance > b.properties.distance) {
            return 1;
          }
          if (a.properties.distance < b.properties.distance) {
            return -1;
          }
          return 0; // a must be equal to b
        });

        /**
         * Rebuild the listings:
         * Remove the existing listings and build the location
         * list again using the newly sorted stores.
         */
        const listings = document.getElementById("listings");
        while (listings.firstChild) {
          listings.removeChild(listings.firstChild);
        }
        buildLocationList(stores);

        /* Open a popup for the closest store. */
        createPopUp(stores.features[0]);

        /** Highlight the listing for the closest store. */
        const activeListing = document.getElementById(
          `listing-${stores.features[0].properties.id}`
        );
        activeListing.classList.add("active");

        /**
         * Adjust the map camera:
         * Get a bbox that contains both the geocoder result and
         * the closest store. Fit the bounds to that bbox.
         */
        const bbox = getBbox(stores, 0, searchResult);
        map.current.fitBounds(bbox, {
          padding: 100,
        });
      });

      /**
       * Using the coordinates (lng, lat) for
       * (1) the search result and
       * (2) the closest store
       * construct a bbox that will contain both points
       */
      function getBbox(sortedStores, storeIdentifier, searchResult) {
        const lats = [
          sortedStores.features[storeIdentifier].geometry.coordinates[1],
          searchResult.coordinates[1],
        ];
        const lons = [
          sortedStores.features[storeIdentifier].geometry.coordinates[0],
          searchResult.coordinates[0],
        ];
        const sortedLons = lons.sort((a, b) => {
          if (a > b) {
            return 1;
          }
          if (a.distance < b.distance) {
            return -1;
          }
          return 0;
        });
        const sortedLats = lats.sort((a, b) => {
          if (a > b) {
            return 1;
          }
          if (a.distance < b.distance) {
            return -1;
          }
          return 0;
        });
        return [
          [sortedLons[0], sortedLats[0]],
          [sortedLons[1], sortedLats[1]],
        ];
      }

      /**
       * Add a marker to the map for every store listing.
       **/
      function addMarkers() {
        /* For each feature in the GeoJSON object above: */
        for (const marker of stores.features) {
          /* Create a div element for the marker. */
          const el = document.createElement("div");
          /* Assign a unique `id` to the marker. */
          el.id = `marker-${marker.properties.id}`;
          /* Assign the `marker` class to each marker for styling. */
          el.className = "marker";

          /**
           * Create a marker using the div element
           * defined above and add it to the map.
           **/
          new mapboxgl.Marker(el, { offset: [0, -23] })
            .setLngLat(marker.geometry.coordinates)
            .addTo(map.current);

          /**
           * Listen to the element and when it is clicked, do three things:
           * 1. Fly to the point
           * 2. Close all other popups and display popup for clicked store
           * 3. Highlight listing in sidebar (and remove highlight for all other listings)
           **/
          el.addEventListener("click", (e) => {
            flyToStore(marker);
            createPopUp(marker);
            const activeItem = document.getElementsByClassName("active");
            e.stopPropagation();
            if (activeItem[0]) {
              activeItem[0].classList.remove("active");
            }
            const listing = document.getElementById(`listing-${marker.properties.id}`);
            listing.classList.add("active");
          });
        }
      }

      /**
       * Add a listing for each store to the sidebar.
       **/
      function buildLocationList(stores) {
        for (const store of stores.features) {
          /* Add a new listing section to the sidebar. */
          const listings = document.getElementById("listings");
          const listing = listings.appendChild(document.createElement("div"));
          /* Assign a unique `id` to the listing. */
          listing.id = `listing-${store.properties.id}`;
          /* Assign the `item` class to each listing for styling. */
          listing.className = "item";

          /* Add the link to the individual listing created above. */
          const link = listing.appendChild(document.createElement("a"));
          link.href = "#";
          link.className = "title";
          link.id = `link-${store.properties.id}`;
          link.innerHTML = `${store.properties.address}`;

          /* Add details to the individual listing. */
          const details = listing.appendChild(document.createElement("div"));
          details.innerHTML = `${store.properties.city}`;
          if (store.properties.phone) {
            details.innerHTML += ` &middot; ${store.properties.phoneFormatted}`;
          }
          if (store.properties.distance) {
            const roundedDistance = Math.round(store.properties.distance * 100) / 100;
            details.innerHTML += `<div><strong>${roundedDistance} miles away</strong></div>`;
          }

          /**
           * Listen to the element and when it is clicked, do four things:
           * 1. Update the `currentFeature` to the store associated with the clicked link
           * 2. Fly to the point
           * 3. Close all other popups and display popup for clicked store
           * 4. Highlight listing in sidebar (and remove highlight for all other listings)
           **/
          link.addEventListener("click", function () {
            for (const feature of stores.features) {
              if (this.id === `link-${feature.properties.id}`) {
                flyToStore(feature);
                createPopUp(feature);
              }
            }
            const activeItem = document.getElementsByClassName("active");
            if (activeItem[0]) {
              activeItem[0].classList.remove("active");
            }
            this.parentNode.classList.add("active");
          });
        }
      }

      /**
       * Use Mapbox GL JS's `flyTo` to move the camera smoothly
       * a given center point.
       **/
      function flyToStore(currentFeature) {
        map.current.flyTo({
          center: currentFeature.geometry.coordinates,
          zoom: 15,
        });
      }

      /**
       * Create a Mapbox GL JS `Popup`.
       **/
      function createPopUp(currentFeature) {
        const popUps = document.getElementsByClassName("mapboxgl-popup");
        if (popUps[0]) popUps[0].remove();

        const popup = new mapboxgl.Popup({ closeOnClick: false })
          .setLngLat(currentFeature.geometry.coordinates)
          .setHTML(`<h3>Sweetgreen</h3><h4>${currentFeature.properties.address}</h4>`)
          .addTo(map.current);
      }
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
      <div ref={mapContainer} className="w-screen h-screen relative overflow-auto" />
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div
        className="absolute mt-3 ml-10 p-5 w-[25%] top-0 bottom-5 bg-slate-900/[.60] overflow-y-scroll
          z-10"
      >
        <h1 className="font-semibold text-white text-center tracking-wider">Our locations</h1>

        <div id="listings" className="text-blue-900 bg-blue-50 text-base mt-8 p-4 listings"></div>
      </div>
    </>
  );
};

export default MapSortStoresDistance;
