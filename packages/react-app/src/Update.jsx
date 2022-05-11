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
import { dataURItoBlob, getHashURLParam, getURLParam } from "./helpers";
import ContractAddress from "./contracts/Frames.address";
import { Loading3QuartersOutlined, LoadingOutlined } from "@ant-design/icons";


function ShowIteration(props) {
    const { data } = props;

    return (
        <>
            {data ?
                <div style={{ border: "1px solid black" }}>
                    <img src={data.image} />
                    <h4 style={{color: "black"}}>{data.name}</h4>
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
    const [newTitle, setNewTitle] = useState("");
    const DESCRIPTION_PLACEHOLDER = "Interpretation is a product of perspective. The frame from which we see things shapes our experience, now it can shape the things as well. Frame explores the intersection of art and ownership to create a piece of media that is effected by its owners in a way that has never been possible before.";
    const [description, setDescription] = useState();
    const [iterations, setIterations] = useState([]);
    const [newImageSet, setNewImageSet] = useState(false);
    const [historyHunting, setHistoryHunting] = useState(false);

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
            await getData(tokenURI, d => {
                setBaseFile(d.image);
                setDescription(d.description);
                setNewTitle(d.name);
            });
        }
    }

    console.log(`iterations is ${iterations}`);
    console.log(iterations);
    console.log(history);

    React.useEffect(() => {
        let urlId = getHashURLParam("id") 
        console.log(`got url id ${urlId}`);
        if (urlId & !id) {
            setId(urlId);
            setDescription(DESCRIPTION_PLACEHOLDER)

        }

        if (history && !historyHunting) {
            gatherHistory(history);
        }


    }, [userSigner, id, history]);

    async function gatherHistory(history) {
        console.log(`getting history`);
        setHistoryHunting(true);
        for (var i = 0; i < history.length; i++) {
            await getData(history[i], d=> {
                console.log(`adding ${d.timestamp} to iterations`);
                iterations.unshift(d)
                setIterations(iterations);
            });
        }
    }

    async function getData(tokenURI, callback) {
        const res = await fetch(tokenURI);
        const data = await res.json();
        console.log(data);
        console.log(`^history data ${data.timestamp}`);
        const image = await getImage(data.image);
        data.image = image;
        callback(data);

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

            setBaseFile(canvas.toDataURL());
            console.log(canvas.toDataURL());
            console.log(`canvas saved ^^`);
        };

        img1.src = base64ImageString;
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

            const imageUpload = await ipfsClient.add(dataURItoBlob(baseFile));
            const imagePath = `https://ipfs.io/ipfs/${imageUpload.path}`;
            console.log(`image uploaded to ${imagePath}`);
            var dt = { image: imagePath, name:newTitle, description, timestamp: Date.now() };
            const { path } = await ipfsClient.add(JSON.stringify(dt));
            const data = contractInstance.interface.encodeFunctionData("update", [id, `https://ipfs.io/ipfs/${path}`]);
            console.log(`new update: https://ipfs.io/ipfs/${path}`);
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
            return <img src={baseFile} alt="The image hasnt loaded yet from IPFS" />
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
                            if (window.location.toString().includes("?id=")) {

                                window.location = window.location.toString().split("?id=")[0]+"?"+urlParams;
                            } else {
                                window.location = window.location+"?"+urlParams;
                            }
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
                                    setNewImageSet(true);

                                }} /> <div style={{ display: "flex", flexDirection: "column" }}><>OR</> <p style={{ fontSize: "xx-small", color: "limegreen" }}>(Only Image Files/URLs are allowed)</p>
                                    </div> <input type="text" id="linkToUse" placeholder="URL of image" onChange={(e) => { urlToObject(e.target.value); setNewImageSet(true); }} /> </div>
                            </>
                            <br/>
                            <Input style={{width: "60%", color: "black", textAlign: "center"}} type="text" value={newTitle} onChange={(e)=> {setNewTitle(e.target.value)}}/>
                            <br/><br/>
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
                    <br />

                    <br />
                    {history && (iterations.length == history.length) ?
                        <>
                            <h3 style={{ color: "black" }}>👇explore the history of this frame👇</h3>
                            {iterations.map(e => <ShowIteration data={e} />)}
                        </>
                        : <>Each page of this frames history is loading one by one... </>}

                </div>
            </div>
        </div>
    );
};

export default Update;