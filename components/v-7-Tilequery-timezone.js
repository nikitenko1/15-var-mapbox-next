// https://docs.mapbox.com/help/tutorials/create-a-timezone-finder-with-mapbox-tilequery-api/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

// https://earthquake.usgs.gov/fdsnws/event/1/[METHOD[?PARAMETERS]]

const MapTimezoneFinder = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  const [zoom] = useState(11);

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

  // The format of a Tilequery API call is:
  //`api.mapbox.com/v4/{tileset}/tilequery/{longitude},{latitude}.json?access_token=${token}`

  useEffect(() => {
    map.current.on("load", () => {
      navigator.geolocation.getCurrentPosition((position) => {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        console.log(`Your location: ${longitude},${latitude}`);
      });
    });
    // create variable for the return message -
    // this makes it easier to access it later!
    const returnMessage = document.getElementById("return-message");
    // create a variable that selects the button
    const tzButton = document.getElementById("tz-button");

    function getUserLocation() {
      // show a loading animation while we wait for the data
      tzButton.classList.add("loading");
      tzButton.disabled = true;
      async function success(position) {
        // create variables that will hold the
        // user's latitude and longitude data
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        // use the Mapbox Tilequery API to query the timezone tileset
        const res = await axios.get(
          `https://api.mapbox.com/v4/examples.4ze9z6tv/tilequery/${longitude},${latitude}.json?access_token=${token}`
        );

        // grab the timezone from the resulting JSON
        const userTimezone = res.data.features[0].properties.TZID;
        // on success, display the user's timezone
        tzButton.classList.remove("loading");
        tzButton.disabled = false;
        returnMessage.textContent = `You are in the ${userTimezone} timezone.`;
      }

      // if anything goes wrong, remove the loading animation and display an error message
      function error() {
        tzButton.classList.remove("loading");
        tzButton.disabled = false;
        returnMessage.textContent = "Sorry, unable to determine your current location.";
      }

      navigator.geolocation.getCurrentPosition(success, error);
    }
    // when the button is clicked, call the getUserLocation function
    tzButton.onclick = getUserLocation;
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div
        className="absolute left-[40%] top-8 max-h-fit max-w-fit border-2 border-orange-600
    bg-slate-100 p-4 text-center"
      >
        <h1 className="font-semibold text-2xl">Timezone finder</h1>
        <p>
          <button id="tz-button" className="border-2 hover:bg-amber-100 transition-colors">
            <span className="tz-button-text">Find my timezone!</span>
          </button>
        </p>
        <p id="return-message" className="font-semibold my-4 text-lg underline text-orange-600"></p>
      </div>
    </>
  );
};

export default MapTimezoneFinder;
