import React from "react";
import { Stack, Text, Button, chakra } from "@chakra-ui/react";

const Card = ({ name, image, contract_type, token_address, token_id }) => {
  const handleRentWithDeefy = () => {
    window.Dayfi.openBuyNowPayLater({
      tokenAddress: token_address,
      tokenId: token_id,
      contractType: contract_type,
      name,
      lisitngPrice: 0.26,
    });
  };

  return (
    <Stack border={"1px solid"} p={4}>
      <chakra.img src={image} h={"80"} w={"80"} />
      <Text>{name}</Text>
      <Button colorScheme={"purple"} onClick={() => handleRentWithDeefy()}>
        Rent with dayfi
      </Button>
    </Stack>
  );
};

export default Card;
