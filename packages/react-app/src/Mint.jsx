import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Menu, Row, Input, InputNumber } from "antd";
const { TextArea } = Input;
import P5Wrapper from 'react-p5-wrapper';
const { ethers } = require("ethers");
import { formatEther, formatUnits, parseEther } from "ethers/lib/utils";
import { Link } from "react-router-dom";
import {
    useBalance,
    useContractLoader,
    useContractReader,
    useExternalContractLoader,
    useEventListener,
    useExchangePrice,
    useGasPrice,
    useOnBlock,
    useUserProvider,
} from "./hooks";
import { create as createIPFSClient } from'ipfs-http-client';
const ipfsClient = createIPFSClient('https://ipfs.infura.io:5001')
import { Account, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import FramesAbi from "./contracts/Frames.abi";
import { getURLParam } from "./helpers";
import ContractAddress from "./contracts/Frames.address";



function Mint(props) {
    const { useHistory, tx, provider, userSigner, price, logoutOfWeb3Modal, blockExplorer, loadWeb3Modal, web3Modal, address } = props;
    const [showModal, setShowModal] = useState(true);
    const [loading, setLoading] = useState();
    const [baseFile, setBaseFile] = useState();
    const DESCRIPTION_PLACEHOLDER = "Interpretation is a product of perspective. The frame from which we see things shapes our experience, now it can shape the things as well. Frame explores the intersection of art and ownership to create a piece of media that is effected by its owners in a way that has never been possible before.";
    const [description, setDescription] = useState(DESCRIPTION_PLACEHOLDER);

    let ref = getURLParam("ref");
    if (!ref) {
      ref = "0x0000000000000000000000000000000000000000";
    }
    console.log(`ref is ${ref}`);

    const contractInstance = useExternalContractLoader(provider, ContractAddress, FramesAbi);
    console.log(`contractInstance is ${contractInstance}, userSigner ${userSigner}`);
    console.log(provider);
    console.log(userSigner);
    React.useEffect(() => {
       
    }, [userSigner, provider, tx]);

    // keep track of a variable from the contract in the local React state:
    const maxSupply = useContractReader({ Frames: contractInstance }, "Frames", "maxSupply");
    console.log(`max supply is ${maxSupply}`);
    const mintedSoFar = useContractReader({ Frames: contractInstance }, "Frames", "minted");
    console.log(`mintedSoFar is ${mintedSoFar}`);

    function getBase64(file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            console.log(reader.result);
            setBaseFile(reader.result);
           formatFrame(reader.result);
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }

    function formatFrame(base64ImageString) {
        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
        var img1 = new Image();
        var img2 = new Image();
        img1.onload = function () {
            canvas.width = 400;
            canvas.height = 400;

            img2.src = "bg.png";
        };
        img2.onload = function () {
            context.globalAlpha = 1.0;
            context.drawImage(img1, 0, 0, img1.width, img1.height, canvas.width / 10, canvas.height / 20 * 3, canvas.width * 0.73, canvas.height * 0.76);
            //  context.globalAlpha = 0.5; //Remove if pngs have alpha
            context.drawImage(img2, 0, 0, img2.width, img2.height, 0, 0, canvas.width, canvas.height);
        };

        img1.src = base64ImageString;
        setBaseFile(canvas.toDataURL());
    }

    const urlToObject= async(imageURL)=> {
        console.log(`getting ${imageURL}`);
        const response = await fetch(imageURL);
        // here image is url/location of image
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', {type: blob.type});
        console.log(file);
        getBase64(file);
      }

      const mintBtnClick = async (contractInstance) => {
        console.log(`base file ${baseFile}`)
         console.log(baseFile);
         if (!baseFile) {
             alert("Please fill the frame first");
         } else {
            setLoading(true);
            const imageUpload = await ipfsClient.add(baseFile);
            const imagePath = `https://ipfs.io/ipfs/${imageUpload.path}`;
            var dt = { image: imagePath, name: `Frame #${parseInt(mintedSoFar) + 1}`, description, timestamp: Date.now() };
            const { path } = await ipfsClient.add(JSON.stringify(dt));
            console.log([address, `https://ipfs.io/ipfs/${path}`, ref]);
            const data = contractInstance.interface.encodeFunctionData("mint", [address, `https://ipfs.io/ipfs/${path}`, ref]);
            await tx(
                userSigner.sendTransaction({
                    to: ContractAddress,
                    data: data,
                    value: parseEther((0.02).toString()),
                }),
            );
            setLoading(false);
            window.location.replace(window.location.protocol+"//"+window.location.host+"/update?id="+(parseInt(mintedSoFar) + 1));
      
         }
        }


    return (
        <div style={{ height: "100%"}}>
            <div style={{position: "absolute", left: "2%", top:"2%"}}>
            <Link to={"/"}> 🏠  </Link></div>
            <div  style={{ display: showModal ? "block" : "none",}} >
                <div style={{ backgroundColor: "antiquewhite", color: "black" }}>
                    <h1 style={{ color: "black" }}>This blank canvas is your's to fill:</h1>
                    <p style={{ color: "darkgray" }}><i>Each frame is a unique art piece created by you. {baseFile ? "Below you can preview your framed image:" : " To begin use the file input below to upload the first image you would like to display in your frame."}</i></p>
                    {baseFile ?
                        <div>
                            <p><b>STEP 1: ✅</b></p>
                            <canvas id="canvas"></canvas>
                        </div>
                        :
                        <>
                            <div style={{ display: "flex", justifyContent: "space-around" }}> <input type="file" id="fileToUse" onChange={(e) => {
                                setBaseFile(getBase64(document.getElementById("fileToUse").files[0]))
                                console.log(baseFile)
                                console.log(getBase64(document.getElementById("fileToUse").files[0]))

                            }} /> <div style={{display: "flex", flexDirection: "column"}}><>OR</> <p style={{fontSize: "xx-small", color: "limegreen"}}>(Only Image Files/URLs are allowed)</p>
                            </div> <input type="text" id="linkToUse" placeholder="URL of image" onChange={(e) => { urlToObject(e.target.value) }}/> </div>
                        </>
                    }

                    {baseFile ? 
                    <>
                    <p><b>STEP 2:</b> (Optionally) Customize the description of your art piece.</p>
                    <TextArea
                    style={{ border: "none", textDecoration: "none", textAlign: "center", color: "black" }}
                    placeholder={''}
                    backgroundColor="white"
                    value={description}
                    onChange={(e) => {
                        //localStorage.clear();
                        setDescription(e.target.value)
                    }}
                /></>
                    : <></>}
                 

                    <br />
                    <br />

                    <p>{formatUnits(mintedSoFar ? mintedSoFar : "0", "wei")}/{formatUnits(maxSupply ? maxSupply : "0", "wei")} art pieces framed</p>
                    {!loading ?
                        (userSigner ?
                            <Button style={{ color: "black" }} onClick={()=>mintBtnClick(contractInstance)}>Frame Your Art</Button>
                            :
                            <div onClick={() => setShowModal(false)}>
                                <Account
                                    address={address}
                                    /*  localProvider={localProvider} */
                                    userSigner={userSigner}
                                    mainnetProvider={provider}
                                    price={price}
                                    web3Modal={web3Modal}
                                    loadWeb3Modal={loadWeb3Modal}
                                    logoutOfWeb3Modal={logoutOfWeb3Modal}
                                    blockExplorer={blockExplorer}
                                />
                            </div>
                        )
                        : <>Loading...</>
                    }

                    <div style={{ display: "none" }}>
                    </div>
                    <br />
                    <br />
                    {/* <img src="./samples.gif" width="60" height="70" />
 */}
                    <br />

                    <br />
                    {provider ?
                        <p>Refer someone and earn 10% of their mint fee:<br />
                            <a href={`https://pillz.art/?ref=${address}`}>{`https://pillz.art/?ref=${address}`}</a></p>
                        : <></>}

                </div>
            </div>
        </div>
    );
};

export default Mint;