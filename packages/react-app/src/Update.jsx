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
import { create as createIPFSClient } from 'ipfs-http-client';
const ipfsClient = createIPFSClient('https://ipfs.infura.io:5001')
import { Account, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import FramesAbi from "./contracts/Frames.abi";
import { getURLParam } from "./helpers";
import ContractAddress from "./contracts/Frames.address";
import { Loading3QuartersOutlined, LoadingOutlined } from "@ant-design/icons";


function ShowIteration(props) {
    const { data } = props;

    return (
        <>
            {data ?
                <div style={{ border: "1px solid black" }}>
                    <img src={data.image} />
                    <p><b>{new Date(data.timestamp).toString()}</b></p>
                    <p>{data.description}</p>
                </div>
                : <>Loading past iteration...</>}
        </>
    )
}


function Update(props) {
    const { tx, address, provider, userSigner, price, logoutOfWeb3Modal, blockExplorer, loadWeb3Modal, web3Modal } = props;
    const [showModal, setShowModal] = useState(true);
    const [loading, setLoading] = useState();
    const [id, setId] = useState();
    const [baseFile, setBaseFile] = useState("");
    const DESCRIPTION_PLACEHOLDER = "Interpretation is a product of perspective. The frame from which we see things shapes our experience, now it can shape the things as well. Frame explores the intersection of art and ownership to create a piece of media that is effected by its owners in a way that has never been possible before.";
    const [description, setDescription] = useState();
    const [iterations, setIterations] = useState([]);
    const [newImageSet, setNewImageSet] = useState(false);

    const contractInstance = useExternalContractLoader(provider, ContractAddress, FramesAbi);




    // keep track of a variable from the contract in the local React state:
    const tokenURI = useContractReader({ Frames: contractInstance }, "Frames", "tokenURI", [id]);
    const history = useContractReader({ Frames: contractInstance }, "Frames", "history", [id]);
    const owner = useContractReader({ Frames: contractInstance }, "Frames", "ownerOf", [id]);
    if (baseFile == "") {
        setup();
    }

    async function setup() {
        if (!newImageSet) {
            const d = await getData(tokenURI);
            setBaseFile(d.image);
            setDescription(d.description);
        }
    }

    console.log(`iterations is ${iterations}`);
    console.log(iterations)
    console.log(history)


    React.useEffect(() => {
        let urlId = getURLParam("id");
        if (urlId & !id) {
            setId(urlId);
            setDescription(DESCRIPTION_PLACEHOLDER)

        }

        if (history && iterations.length != history.length) {
            gatherHistory(history);
        }


    }, [userSigner, id, history]);

    async function gatherHistory(history) {
        for (var i = 0; i < history.length; i++) {
            const d = await getData(history[i]);
            setIterations([d].concat(iterations));
        }
    }

    async function getData(tokenURI) {
        const res = await fetch(tokenURI);
        const data = await res.json();
        console.log(data);
        console.log("^tokendata");
        const image = await getImage(data.image);
        data.image = image;
        return data;

    }

    async function getImage(imageURL) {
        const res = await fetch(imageURL);
        const b64 = await res.text();
        return b64;
    }

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

    const urlToObject = async (imageURL) => {
        console.log(`getting ${imageURL}`);
        const response = await fetch(imageURL);
        // here image is url/location of image
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        console.log(file);
        getBase64(file);
    }

    const updateBtnClick = async (contractInstance) => {
        console.log(`base file ${baseFile}`)
        console.log(baseFile);
        if (!baseFile) {
            alert("Please fill the frame first");
        } else {
            setLoading(true);
            const imageUpload = await ipfsClient.add(baseFile);
            const imagePath = `https://ipfs.io/ipfs/${imageUpload.path}`;
            var dt = { image: imagePath, name: `Frame #${id}`, description, timestamp: Date.now() };
            const { path } = await ipfsClient.add(JSON.stringify(dt));
            const data = contractInstance.interface.encodeFunctionData("update", [id, `https://ipfs.io/ipfs/${path}`]);
            await tx(
                userSigner.sendTransaction({
                    to: ContractAddress,
                    data: data,
                    value: 0,
                }),
            );
            setLoading(false);
            window.location.reload();
        }
    }

    function showImage() {
        if (newImageSet) {
            return (<canvas id="canvas"></canvas>)
        } else {
            return <img src={baseFile} />
        }
    }

    return (
        <div>
            <div style={{ position: "absolute", left: "2%", top: "2%" }}>
                <Link to={"/"}> 🏠  </Link></div>
            <div style={{ display: showModal ? "block" : "none" }} >
                <div style={{ backgroundColor: "antiquewhite", color: "black" }}>
                    <h1 style={{ color: "black" }} placeholder="enter nft id">Enter ID:</h1>
                    <input type="text" value={id} onChange={(e) => {
                        if (e.target.value != "") {
                            const urlParams = new URLSearchParams(window.location.search);

                            urlParams.set('id', e.target.value);

                            window.location.search = urlParams;
                        }
                        setId(e.target.value)
                    }
                    } />
                    <br />
                    {
                        showImage()}
                    {baseFile ?
                        <div>
                            {baseFile.includes("data:") ?
                                <></> :
                                <>
                                    <Loading3QuartersOutlined />
                                    <p style={{ color: "darkgray" }}><i>Your image is being downloaded from the interplanetary file system...</i></p>
                                </>
                            }
                        </div>
                        :
                        (id ?
                            <>
                                <br />
                                <LoadingOutlined />
                                <p style={{ color: "darkgray" }}><i>Your image is being downloaded from the interplanetary file system...</i></p>
                            </>
                            : <></>)

                    }

                    {baseFile && (owner == address) ?
                        <>
                            <h3 style={{ color: "black" }}>As Owner You can update this Frame whenever you want: </h3>
                            <>
                                <div style={{ display: "flex", justifyContent: "space-around" }}> <input type="file" id="fileToUse" onChange={(e) => {
                                    getBase64(document.getElementById("fileToUse").files[0]);
                                    console.log(baseFile);
                                    console.log(getBase64(document.getElementById("fileToUse").files[0]));
                                    setNewImageSet(true);

                                }} /> <div style={{ display: "flex", flexDirection: "column" }}><>OR</> <p style={{ fontSize: "xx-small", color: "limegreen" }}>(Only Image Files/URLs are allowed)</p>
                                    </div> <input type="text" id="linkToUse" placeholder="URL of image" onChange={(e) => { urlToObject(e.target.value); setNewImageSet(true); }} /> </div>
                            </>

                            <TextArea
                                style={{ width: "80%", textDecoration: "none", textAlign: "center", color: "black" }}
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

                    {!loading ?
                        (userSigner ?
                            <Button style={{ color: "black" }} onClick={() => updateBtnClick(contractInstance)}>Reframe Your Art</Button>
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
                    {iterations ?
                        <>
                            <h3 style={{ color: "black" }}>👇explore the history of this frame👇</h3>
                            {iterations.map(e => <ShowIteration data={e} />)}
                        </>
                        : <></>}

                </div>
            </div>
        </div>
    );
};

export default Update;