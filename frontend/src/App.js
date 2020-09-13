import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import Navbar from "./Navbar/Navbar";
import ContentContainer from "./Content/ContentContainer";
import "./App.css";

function App() {
  var currentUrl = document.URL, urlParts = currentUrl.split('#');
  let loc = (urlParts.length > 1) ? urlParts[1] : "gym";
  const [activePage, changePage] = useState(loc);
  const [pageData, updatePageData] = useState(null);

  useEffect(() => {
    const host = "http://localhost:8081/";
    fetch(host + activePage).then(res => res.json()).then(data => {
      console.log(data);
      updatePageData(data);
    });
  }, [activePage]);

  const loading = <p>loading</p>;
  if (!pageData) return loading;
  return (
    <div>
      <Navbar activePage />
      < ContentContainer pageData />
    </div>
  )
}

export default App;
