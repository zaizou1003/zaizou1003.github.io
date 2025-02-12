import React, { lazy, Suspense } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import Skills from '../components/Skills';
import Experience from '../components/Certificates';
import EducationTimeline from '../components/Education';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import ProjectDetails from '../components/ProjectDetails'; 
import styled from "styled-components";
import { Helmet } from 'react-helmet';
import data from '../utils/data';

const Wrapper = styled.div`
  background: linear-gradient(38.73deg, rgba(204, 0, 187, 0.15) 0%, rgba(201, 32, 184, 0) 50%),
    linear-gradient(141.27deg, rgba(0, 70, 209, 0) 50%, rgba(0, 70, 209, 0.15) 100%);
  width: 100%;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 98%, 0 100%);
`;

// Lazy load the components
const Projects = lazy(() => import('../components/Projects'));

const Home = ({ firebaseData, openModal, setOpenModal }) => {
  return (
    <>
      <Helmet>
        <title>Ahmed Aziz Ben Aissa | AI/ML & Data Management Portfolio</title>
        <meta name="description" content="Ahmed Aziz Ben Aissa's portfolio, showcasing projects in AI, ML and Data Visualisation." />
        <meta name="keywords" content="Ahmed Aziz Ben Aissa, AI, ML, Data Management, Portfolio, Projects" />
        <link rel="canonical" href="https://github.com/zaizou1003" />
      </Helmet>

      <Navbar 
        navbarData={data.Bio || {}} 
        sections={['About', 'Skills', 'Certificates', 'Projects', 'Education']} 
      />

      <HeroSection 
        heroData={data.Bio || {}} 
      />

      <Wrapper>
        <Skills 
          skillsData={data.skills || []} 
        />
        <Experience />
      </Wrapper>

      <Suspense>
        <Projects 
          projectsData={data.projects || []} 
          openModal={openModal} 
          setOpenModal={setOpenModal} 
          defaultfilter="top"
          AllCard={1}
          projectFilters={null} 
          ShowTitle={true}
          IntroText={true}
        />
      </Suspense>

      <Wrapper>
        <EducationTimeline 
          education={data.education || []} 
        />
        <Contact />
      </Wrapper>
      
      <Footer 
        footerData={data.Bio || {}} 
        links={["About", "Skills", "Certificates", "Projects", "Education"]} 
      />

      {openModal.state && (
        <ProjectDetails 
          projectsData={firebaseData.projects || []} 
          openModal={openModal} 
          setOpenModal={setOpenModal} 
        />
      )}
    </>
  );
};

export default Home;
