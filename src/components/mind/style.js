import styled, { keyframes } from "styled-components";
import { IoIosArrowBack } from "react-icons/io";


// 🔄 Keyframe Animation for Rotation
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// 🌌 Full-Screen Background
export const Container = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle, #021a30, #000);
  overflow: hidden;
`;

// 🧠 3D Brain Container
export const Mind = styled.div`
  position: relative;
  width: 300px;
  height: 300px;
  animation: ${rotate} 20s linear infinite;
`;

// 🔴 Interactive Points
export const Point = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: transform 0.2s;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }
`;

// 💬 Tooltip Style
export const Tooltip = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 5px;
  font-family: sans-serif;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;

// 📝 Info Panel Styles
export const InfoPanel = styled.div`
  position: absolute;
  top: 20%;
  right: 5%;
  width: 250px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const InfoTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

export const InfoText = styled.p`
  font-size: 0.9rem;
  margin: 10px 0;
`;

export const CloseButton = styled.button`
  margin-top: 10px;
  padding: 5px 10px;
  background: red;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  transition: 0.2s ease-in-out;

  &:hover {
    background: darkred;
  }
`;

// 📌 Floating Label at the Top Center
export const TopLabel = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 1.5rem;
  pointer-events: none;
  z-index: 1000;
`;

export const BackButton = styled.button`
  position: absolute;
  top: 20px;    /* Adjusts distance from the top */
  left: 20px;   /* Adjusts distance from the left */
  z-index: 1000;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.white};
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s ease;
  border-radius: 30px;
  padding: 5px 10px 5px 5px;
  border: 1px solid ${({ theme }) => theme.white};

  &:hover {
    background-color: ${({ theme }) => theme.card};
  }

  @media (max-width: 768px) {
    top: 15px;
    left: 15px;
    border: none;
  }
`;

export const BackIcon = styled(IoIosArrowBack)`
  color: ${({ theme }) => theme.white};
  font-size: 24px;
`;

export const BackText = styled.span`
  @media (max-width: 768px) {
    display: none;
  }
`;