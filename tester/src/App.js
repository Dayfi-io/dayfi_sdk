import { useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import Profile from "./Profile";

import Dayfi from "dayfi_sdk";

function App() {
  const getSigner = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const sigerT = provider.getSigner();
    const address = await sigerT.getAddress();
    const sdk = new Dayfi({ provider: window.ethereum, signer: sigerT, library: "ethers" });
  };

  useEffect(() => {
    getSigner();
  }, []);

  return (
    <div className="App">
      <Profile />
    </div>
  );
}

export default App;
