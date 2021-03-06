import React, {Component} from 'react';
import ethers from 'ethers';
import FaucetLink from './Faucet';
const qs = require('querystring');
import { TOKEN_ADDRESS } from './constants';
import { EtherscanLink, EtherscanAddressLink } from './common';


class ClaimLink extends Component {
    constructor(props) {
	super(props);
	console.log({props});
	const queryParams = qs.parse(props.location.search.substring(1));
	const {
	    sig: sigSender,
	    pk: transitPK,
	    a: amount,
	    from: sender
	} = queryParams;

	// get identity address from localstorage
	const identityPK = localStorage.getItem("LINKS_IDENTITY_PK");
	const identity = localStorage.getItem("LINKS_IDENTITY");	
	const pendingTxHash = localStorage.getItem("LINKS_PENDING_TX_HASH");
	
	this.state = {
	    // identity 
	    identity, 
	    identityPK,
	    newIdentity: (identity === null),

	    // params from url
	    sigSender,
	    transitPK,
	    amount,
	    sender,

	    // claim tx
	    checkingLink: true,
	    usedLink: false,
	    txHash: pendingTxHash,
	    txReceipt: null,
	    disabled: false,
	};
    }

    async componentDidMount() {
    	const {transitPK, sender} = this.state;
    	const result = await this.props.sdk.hasLinkBeenUsed({transitPK, sender});
    	console.log({result});
    	this.setState({
    	    checkingLink: false,
    	    usedLink: result
    	});

	if (this.state.txHash) {
	    let newIdentity;
	    const txReceipt = await this.props.sdk.waitForTxReceipt(this.state.txHash);
	    console.log({txReceipt});
	    
	    if (this.state.newIdentity) {
		newIdentity = txReceipt.logs[0] && txReceipt.logs[0].address;

		this.setState({

		});
		
		localStorage.setItem("LINKS_IDENTITY", newIdentity);
	    }
	    
	    this.setState({
		txReceipt,
		identity: this.state.identity || newIdentity
	    });

	    
	    localStorage.removeItem("LINKS_PENDING_TX_HASH");
	}
	
    }
    
    async claimLink() {
	console.log("In a claim link");
	if (this.state.disabled) { return false; }
	const {
	    identity, 
	    identityPK,	    
	    sigSender,
	    transitPK,
	    amount,
	    sender
	} = this.state;
	this.setState({disabled: true});
	try { 
	    //     // send tx
	    const { response, txHash, identityPK: newIdentityPK }  = await this.props.sdk.transferByLink({
		token: TOKEN_ADDRESS,
		amount, sender,
		sigSender,
		transitPK, identityPK
	    });
	    console.log({response, txHash, newIdentityPK});
	    // store pending tx Hash
	    localStorage.setItem("LINKS_PENDING_TX_HASH", txHash);
	    localStorage.setItem("LINKS_IDENTITY_PK", newIdentityPK);
	    this.setState({
		txHash
	    });
	    
	    // wait for tx to be mined
	    const txReceipt = await this.props.sdk.waitForTxReceipt(txHash);
	    console.log({txReceipt});
	    let newIdentity;
	    if (this.state.newIdentity) {
		newIdentity = txReceipt.logs[0] && txReceipt.logs[0].address;

		this._saveToLocalStorage({
		    identityPK: newIdentityPK,
		    identity: newIdentity
		});
	    }	
	    
	    this.setState({
		txReceipt,
		identity: identity || newIdentity
	    });

	    // #todo store identity PK in localstorage 
	    
	} catch (err) {
	    console.log({err});
	    if (err.search("Error: invalid json response at XMLHttpRequest.request.onreadystatechange") !== 0) { 
		alert("Error while claiming tx! Details in the console");
	    }
	}
    }

    _saveToLocalStorage({identityPK, identity}) {
	console.log("saving new identity to localstorgae");
	localStorage.setItem("LINKS_IDENTITY_PK", identityPK);
	localStorage.setItem("LINKS_IDENTITY", identity);
	localStorage.removeItem("LINKS_PENDING_TX_HASH");	
	console.log("new identity saved!");
    }
    
    _renderClaimBtn() {
	// if tx wasn't initiated
	if (this.state.checkingLink) {
	    return (<div> Checking link...</div>)
	}

	if (this.state.usedLink) {
	    return (<div style={{fontWeight: 'bold'}}> Link was used</div>)
	}

	
	if (!this.state.txHash) {
	    const btnClass = this.state.disabled ? "btn fullwidth disabled" : "btn fullwidth";
	    return ( <button style={{ marginTop: 20, width: 100}} className={btnClass} onClick={this.claimLink.bind(this)}> <div>Claim </div></button>);
	}

	// tx sent but not mined yet
	if (!this.state.txReceipt) { 
	    return (
		    <div>
		    Pending Tx... <EtherscanLink txHash={this.state.txHash} />
		    </div>
	    );
	}
	
	// tx was mined
	return (
		<div>
		<div style={{paddingTop: 20, paddingBottom: 10}}> Mined Tx: <EtherscanLink txHash={this.state.txHash} />
		</div>
		<div>
		Claimed To: <EtherscanAddressLink address={this.state.identity} /> 
	    </div>
		</div>
	);	
    }

    _renderLinkDetails() {
	const claimTo = this.state.newIdentity ? "New account" : (<EtherscanAddressLink address={this.state.identity} />);
	return (
		<div>
		<div style={{paddingTop: 10}}> Amount: ${this.state.amount / 100}</div>
		<div style={{paddingTop: 10}}> Claim To: {claimTo} </div>
		</div>
	);
    }
    
    render() {
	return (
		<div>
		<h2> Claim Link </h2>
		{ this._renderLinkDetails() }
	     <hr/>
		{ this._renderClaimBtn() }

	    { this.state.identity ?
	      <div style={{marginTop: 40}}>
	      <a style={{color: '#0099ff', textDecoration: 'underline'}} href="/#/"> Go to Your Account </a>
	      </div>
	      : null
	      
	    } 
		</div>
	);
    }
}

export default ClaimLink;

