import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, HashRouter as Router } from 'react-router-dom'; 
import { ThemeProvider,createGlobalStyle  } from "styled-components";
import { darkTheme, lightTheme } from './utils/Themes.js';
import styled from "styled-components";
import data from "./utils/data.js";


// Pages
import Home from "./pages/Home";
import AllProjects from "./pages/AllProjects.jsx";
import TermsandConditions from "./pages/TermsandConditions.jsx";
import FuturisticMind from "./pages/FuturisticMind.jsx"
import './App.css'; // Move this to the bottom or leave it here if it doesn't affect styles

const Body = styled.div`
  background-color: ${({ theme }) => theme.bg};
`;

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background-color: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
  }
`;

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [openModal, setOpenModal] = useState({ state: false, project: null });
  const [firebaseData, setFirebaseData] = useState({
    Bio: null,
    skills: null,
    projects: null,
    education: null
  });

  useEffect(() => {
    setFirebaseData(data);
  }, []);

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <GlobalStyle />
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Body>
            <Routes>
              <Route path="/" element={
                <Home firebaseData={firebaseData} openModal={openModal} setOpenModal={setOpenModal} />
              } />
              <Route path="/AllProjects" element={
                <AllProjects firebaseData={firebaseData} openModal={openModal} setOpenModal={setOpenModal} />
              } />
              <Route path="/TermsandConditions" element={<TermsandConditions firebaseData={firebaseData}/>} />
              <Route path="/mymind" element={<FuturisticMind />} />
              <Route path="*" element={<Home firebaseData={firebaseData} openModal={openModal} setOpenModal={setOpenModal} />} />
            </Routes>
          </Body>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
