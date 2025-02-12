import React, { Suspense, lazy, useEffect } from 'react';
import ProjectDetails from '../components/ProjectDetails';
import Footer from '../components/Footer';
import Header from '../components/Header/Header.jsx';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import data from '../utils/data'

// Lazy load components
const Projects = lazy(() => import('../components/Projects'));

const ProjectsSection = styled.div`
  padding-top: 80px;
  background: linear-gradient(343.07deg, rgba(132, 59, 206, 0.06) 5.71%, rgba(132, 59, 206, 0) 60.83%);
`;

function AllProjects({ openModal, setOpenModal }) {
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Projects | Ahmed aziz Ben Aissa S Portfolio</title>
        <meta name="description" content="Ahmed Aziz Ben Aissa's portfolio, showcasing projects in AI, ML and Data Visualisation." />
        <meta name="keywords" content="Ahmed Aziz Ben Aissa, AI, ML, Data Management, Portfolio, Projects" />
        <meta name="author" content="Ahmed Aziz Ben Aissa" />
        <link rel="canonical" href="https://your-portfolio-url.com/#/AllProjects" />

        {/* Open Graph Data */}
        <meta property="og:title" content="Ahmed Aziz Ben Aissa - Portfolio | Projects" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://your-portfolio-url.com/#/AllProjects" />
        <meta property="og:image" content="https://sibisiddharth8.github.io/portfolio-react/Og-card-banner-SibiSiddharthS.png" /> #change
        <meta property="og:description" content="Explore projects by Ahmed Aziz Ben Aissa, focusing on AI, ML, and Data Visualisation." />

        {/* Twitter Card Data */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ahmed Aziz Ben Aissa - Projects" />
        <meta name="twitter:description" content="Explore projects by Ahmed Aziz Ben Aissa." />
        <meta name="twitter:image" content="https://sibisiddharth8.github.io/portfolio-react/Og-card-banner-SibiSiddharthS.png" /> #change
      </Helmet>

      <Header 
        Title="Projects Page"
      />
      <ProjectsSection>
        <Suspense>
          <Projects 
            projectsData={data.projects || []} 
            openModal={openModal} 
            setOpenModal={setOpenModal} 
            defaultfilter="all"
            projectFilters={['all', 'AI', 'Computer vision', 'Data Visualisation']}
            ViewAllCard={0}
            ShowTitle={null}
            IntroText={1}
          />
        </Suspense>

        {openModal.state && (
          <ProjectDetails 
            projectsData={data.projects || []} 
            openModal={openModal} 
            setOpenModal={setOpenModal} 
          />
        )}

        <Footer 
          footerData={data.Bio || {}} 
        />
      </ProjectsSection>
    </>
  );
}

export default AllProjects;
