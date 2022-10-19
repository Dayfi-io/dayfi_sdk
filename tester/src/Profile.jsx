import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Text, Flex, Box } from "@chakra-ui/react";
import axios from "axios";
import Card from "./Card";

function Profile() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const [userNft, setUserNft] = useState([]);

  const getNfts = async () => {
    const options = {
      method: "GET",
      url: `https://deep-index.moralis.io/api/v2/${address}/nft`,
      params: { chain: "mumbai", format: "decimal", limit: "5" },
      headers: { accept: "application/json", "X-API-Key": process.env.REACT_APP_MORALIS_API_KEY },
    };

    const { data } = await axios.request(options);
    const { result = [] } = data || {};
    setUserNft(result);
  };

  useEffect(() => {
    if (!isConnected) {
      connect();
    } else {
      getNfts();
    }
  }, [isConnected, connect]);

  return (
    <Box p={"5"}>
      {userNft.length > 0 ? (
        <Flex wrap={"wrap"} gap={"50px"}>
          {userNft.map((nft, index) => {
            const { metadata = "", contract_type = "", token_address = "", token_id = "" } = nft;
            if (metadata) {
              const { image = "", name = "" } = JSON.parse(metadata);
              return (
                <Card
                  key={index}
                  image={image}
                  name={name}
                  contract_type={contract_type}
                  token_address={token_address}
                  token_id={token_id}
                />
              );
            }
            return <></>;
          })}
        </Flex>
      ) : (
        <Text>No NFTs</Text>
      )}
    </Box>
  );
}

export default Profile;
