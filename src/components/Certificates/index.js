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

const CertificatesTimeline = () => {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    setCertificates(data.certificates); // Set the imported data
  }, []);

  return (
    <Container id="certificates">
      <Wrapper>
        <Title>Certificates</Title>
        <Desc>
        My certifications showcasing my skills and accomplishments.
        </Desc>
        <TimelineSection>
            {certificates.map((certificate, index) => (
              <TimelineItem key={certificate.id} aria-label={`Certificate item ${index + 1}`} >
                <TimelineSeparator>
                  <TimelineDot variant="outlined" color="secondary" />
                  {index < certificates.length - 1 && (
                    <TimelineConnector style={{ background: '#854CE6' }} />
                  )}
                </TimelineSeparator>
                <TimelineContent>
                  <ExperienceCard experience={certificate} />
                </TimelineContent>
              </TimelineItem>
            ))}
        </TimelineSection>
      </Wrapper>
    </Container>
  );
};

export default CertificatesTimeline;
