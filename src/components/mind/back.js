import React from "react";
import { useNavigate } from "react-router-dom";
import { BackButton, BackIcon, BackText } from "./style";

function BackButtonComponent() {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page
  };

  return (
    <BackButton onClick={handleBackClick}>
      <BackIcon />
      <BackText>Back</BackText>
    </BackButton>
  );
}

export default BackButtonComponent;
