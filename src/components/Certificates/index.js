import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import ExperienceCard from '../Cards/ExperienceCard';
import { ref, onValue } from "firebase/database"; 
import { database } from "../../FirebaseConfig"; 
import { Padding } from '@mui/icons-material';
import data from '../../utils/data';

const Container = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 0 60px;
  position: relative;
  z-index: 1;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1350px;
  padding: 40px 0 0;
  gap: 12px;
  @media (max-width: 960px) {
    flex-direction: column;
  }
`;

const Title = styled.h2`
  font-size: 42px;
  text-align: center;
  font-weight: 600;
  margin-top: 20px;
  color: ${({ theme }) => theme.text_primary};
  @media (max-width: 768px) {
    margin-top: 12px;
    font-size: 32px;
  }
`;

const Desc = styled.p`
  font-size: 18px;
  text-align: center;
  max-width: 600px;
  color: ${({ theme }) => theme.text_secondary};
  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const TimelineSection = styled.div`
  width: 100%;
  max-width: 1000px;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  @media (max-width: 400px) {
    align-items: flex-end;
  }
`;
const ShowMoreButton = styled.button`
  margin-top: 20px;
  padding: 8px 16px;
  border: 1px solid #854CE6;
  color: #854CE6;
  background: transparent;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease-in-out;

  &:hover {
    background: rgba(133, 76, 230, 0.1);
  }
`;

const CertificatesTimeline = () => {
  const [certificates, setCertificates] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const sorted = [...data.certificates].sort((a, b) => new Date(b.date) - new Date(a.date));
    setCertificates(sorted); // Set the imported data
  }, []);
  const featuredIds = [7, 3, 5];
  const visibleCertificates = showAll
  ? certificates
  : certificates.filter(cert => featuredIds.includes(cert.id));


  return (
    <Container id="certificates">
      <Wrapper>
        <Title>Certificates</Title>
        <Desc>
        My certifications showcasing my skills and accomplishments.
        </Desc>
        <TimelineSection>
            {visibleCertificates.map((certificate, index) => (
              <TimelineItem key={certificate.id} aria-label={`Certificate item ${index + 1}`} >
                <TimelineSeparator>
                  <TimelineDot variant="outlined" color="secondary" />
                  {index < visibleCertificates.length - 1 && (
                    <TimelineConnector style={{ background: '#854CE6' }} />
                  )}
                </TimelineSeparator>
                <TimelineContent>
                  <ExperienceCard experience={certificate} />
                </TimelineContent>
              </TimelineItem>
            ))}

            {certificates.length > 3 && (
              <ShowMoreButton onClick={() => setShowAll(!showAll)}>
                {showAll ? "Show Less" : "Show More"}
              </ShowMoreButton>
            )}
        </TimelineSection>
      </Wrapper>
    </Container>
  );
};

export default CertificatesTimeline;
