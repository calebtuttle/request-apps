import React, { useState } from "react";
import { makeStyles, Typography, Box, Link } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { useWeb3React } from "@web3-react/core";
import { Link as RouterLink } from "react-router-dom";
import { RStatusBadge, downloadPdf } from "request-ui";
import Moment from "react-moment";

import {
  encodeApproveErc20,
  encodePayErc20Request,
  encodePayEthProxyRequest,
  hasSufficientFunds,
  hasErc20Approval,
  utils,
} from "@requestnetwork/payment-processor";
import {
  erc20ProxyArtifact,
  ethereumProxyArtifact,
} from "@requestnetwork/smart-contracts";

import {
  IParsedRequest,
  RequestProvider,
  useRequest,
  cancelRequest,
  isCancelError,
  getPayUrl,
} from "request-shared";

import { useClipboard } from "use-clipboard-copy";

import ErrorPage from "./ErrorPage";
import { useGnosisSafe } from "../contexts/GnosisSafeContext";
import { getAmountToPay } from "@requestnetwork/payment-processor/dist/payment/utils";

export const RequestNotFound = () => {
  return (
    <ErrorPage
      topText="Your request has not been found, sorry!"
      bottomText="You might want to try again later"
    />
  );
};

const Header = () => {
  return (
    <Box padding="24px" paddingBottom={0}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">Your request details</Typography>
        <RouterLink to="/dashboard" style={{ color: "#001428" }}>
          <Typography variant="caption">Go to my dashboard</Typography>
        </RouterLink>
      </Box>
    </Box>
  );
};

const useBodyStyles = makeStyles({
  line: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #E8E7E6",
    padding: "16px 24px",
    "&:last-child": {
      borderBottom: "none",
    },
  },

  status: {
    padding: "4px 12px",
  },
  link: {
    fontSize: 12,
    lineHeight: "14px",
    textDecoration: "underline",
    color: "#001428",
    fontWeight: 600,
    cursor: "pointer",
  },
  primaryLink: {
    cursor: "pointer",
    fontSize: 12,
    lineHeight: "14px",
    color: "#008C73",
    textDecoration: "underline",
    fontWeight: 600,
  },
});

const Body = ({
  account,
  smartContractAddress,
  request,
}: {
  account?: string | null;
  smartContractAddress?: string;
  request?: IParsedRequest;
}) => {
  const classes = useBodyStyles();

  const isAccountPayee = !!account && account.toLowerCase() === request?.payee;
  const isAccountPayer = !!account && account.toLowerCase() === request?.payer;

  const isSmartContractPayee =
    !!smartContractAddress &&
    smartContractAddress.toLowerCase() === request?.payee;
  const isSmartContractPayer =
    !!smartContractAddress &&
    smartContractAddress.toLowerCase() === request?.payer;

  const isPaymentAddressSmartContract =
    request &&
    !!smartContractAddress &&
    smartContractAddress.toLowerCase() === request.paymentAddress.toLowerCase();

  return (
    <Box display="flex" flexDirection="column">
      <Box className={classes.line}>
        <Box>
          <Typography variant="h5">Date</Typography>
        </Box>
        <Box>
          {request ? (
            <Typography>
              <Moment format="ll">{request.createdDate}</Moment>
            </Typography>
          ) : (
            <Skeleton animation="wave" variant="text" width={50} />
          )}
        </Box>
      </Box>
      <Box className={classes.line}>
        <Box>
          <Typography variant="h5">Amount</Typography>
        </Box>
        <Box>
          {request ? (
            <Typography>
              {request.amount} {request.currency}
            </Typography>
          ) : (
            <Skeleton animation="wave" variant="text" width={50} />
          )}
        </Box>
      </Box>
      <Box className={classes.line}>
        <Box>
          <Typography variant="h5">From</Typography>
        </Box>
        <Box>
          {request ? (
            <Typography>
              {request.payee}
              {isAccountPayee ? (
                <strong> (You)</strong>
              ) : isSmartContractPayee ? (
                <strong> (Safe)</strong>
              ) : (
                ""
              )}
            </Typography>
          ) : (
            <Skeleton animation="wave" variant="text" width={200} />
          )}
        </Box>
      </Box>

      {request &&
      request.payee.toLowerCase() !== request.paymentAddress.toLowerCase() ? (
        <Box className={classes.line}>
          <Box>
            <Typography variant="h5">Payment address</Typography>
          </Box>
          <Box>
            {request ? (
              <Typography>
                {request.paymentAddress}
                {isPaymentAddressSmartContract ? <strong> (Safe)</strong> : ""}
              </Typography>
            ) : (
              <Skeleton animation="wave" variant="text" width={200} />
            )}
          </Box>
        </Box>
      ) : (
        ""
      )}

      {(!request || request.payer) && (
        <Box className={classes.line}>
          <Box>
            <Typography variant="h5">To</Typography>
          </Box>
          <Box>
            {request ? (
              <Typography>
                {request.payer}
                {isAccountPayer ? (
                  <strong> (You)</strong>
                ) : isSmartContractPayer ? (
                  <strong> (Safe)</strong>
                ) : (
                  ""
                )}
              </Typography>
            ) : (
              <Skeleton animation="wave" variant="text" width={200} />
            )}
          </Box>
        </Box>
      )}
      {(!request || request.reason) && (
        <Box className={classes.line}>
          <Box>
            <Typography variant="h5">Reason</Typography>
          </Box>
          <Box>
            {request ? (
              <Typography>{request.reason}</Typography>
            ) : (
              <Skeleton animation="wave" variant="text" width={150} />
            )}
          </Box>
        </Box>
      )}

      <Box className={classes.line}>
        <Box>
          <Typography variant="h5">Status</Typography>
        </Box>
        <Box>
          {request ? (
            <RStatusBadge status={request.status} className={classes.status} />
          ) : (
            <Skeleton animation="wave" variant="rect" width={75} height={24} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const ActionsHeader = () => {
  return (
    <Box padding="24px" paddingBottom={0}>
      <Typography variant="subtitle1">Action</Typography>
    </Box>
  );
};

const Actions = ({
  request,
  pay,
  cancel,
  download,
  account,
  smartContractAddress,
}: {
  request?: IParsedRequest;
  pay: () => Promise<void>;
  cancel: () => void;
  download: () => void;
  account?: string;
  smartContractAddress?: string;
}) => {
  const [paying, setPaying] = useState(false);
  const { copied, copy } = useClipboard({
    copiedTimeout: 1000,
  });
  const classes = useBodyStyles();
  const share = () => {
    copy(getPayUrl(request!.requestId));
  };

  const clickPay = async () => {
    setPaying(true);
    try {
      await pay();
    } finally {
      setPaying(false);
    }
  };

  if (!request) {
    return (
      <Box display="flex" flexDirection="column">
        <Box className={classes.line}>
          <Skeleton animation="wave" variant="text" width={100} />
        </Box>
        <Box className={classes.line}>
          <Skeleton animation="wave" variant="text" width={100} />
        </Box>
      </Box>
    );
  }
  if (request.status === "canceled") {
    return (
      <Box className={classes.line}>
        No action to take here. This request has been canceled.
      </Box>
    );
  }
  if (request.status === "paid" || request.status === "overpaid") {
    return (
      <Box display="flex" flexDirection="column">
        <Box className={classes.line}>
          <Link className={classes.primaryLink} onClick={download}>
            Download PDF receipt
          </Link>
        </Box>
        <Box className={classes.line}>
          <Link className={classes.link} onClick={share}>
            {copied ? "Copied!" : "Share this request"}
          </Link>
        </Box>
      </Box>
    );
  }

  if (
    request.payer &&
    (request.payer?.toLowerCase() === smartContractAddress?.toLowerCase() ||
      request.payer?.toLowerCase() === account?.toLowerCase())
  ) {
    return (
      <Box display="flex" flexDirection="column">
        <Box className={classes.line}>
          {paying ? (
            <Typography>Paying...</Typography>
          ) : (
            <Link className={classes.primaryLink} onClick={clickPay}>
              Pay now
            </Link>
          )}
        </Box>
        <Box className={classes.line}>
          <Link className={classes.link} onClick={share}>
            {copied ? "Copied!" : "Share this request"}
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column">
      <Box className={classes.line}>
        <Link className={classes.primaryLink} onClick={share}>
          {copied ? "Copied!" : "Copy link to share this request"}
        </Link>
      </Box>
      <Box className={classes.line}>
        <Link className={classes.link} onClick={cancel}>
          Cancel this request
        </Link>
      </Box>
    </Box>
  );
};
export const RequestPage = () => {
  const { account, chainId } = useWeb3React();
  const { safeInfo, appsSdk } = useGnosisSafe();

  const {
    request,
    loading,
    update,
    counterCurrency,
    counterValue,
  } = useRequest();

  const downloadReceipt = () =>
    downloadPdf({ request: request!, counterCurrency, counterValue });

  const pay = async () => {
    const txs: any[] = [];

    if (!request) {
      // TODO
      alert("Request not found");
      return;
    }
    if (!safeInfo) {
      // TODO
      alert("Safe Info not found");
      return;
    }

    if (request.raw.currencyInfo.type === "ERC20") {
      if (!(await hasSufficientFunds(request.raw, safeInfo.safeAddress))) {
        // TODO
        alert("Insufficient funds");
        return;
      }
      if (!(await hasErc20Approval(request.raw, safeInfo.safeAddress))) {
        // approve if needed
        txs.push({
          to: request.raw.currencyInfo.value,
          value: 0,
          data: encodeApproveErc20(request.raw),
        });
      }
      // the payment through the smart contract
      txs.push({
        to: erc20ProxyArtifact.getAddress(request.raw.currencyInfo.network!),
        value: 0,
        data: encodePayErc20Request(request.raw),
      });
    }

    if (request.raw.currencyInfo.type === "ETH") {
      if (!(await hasSufficientFunds(request.raw, safeInfo.safeAddress))) {
        // TODO
        alert("Insufficient funds");
        return;
      }

      // the payment through the smart contract
      txs.push({
        to: ethereumProxyArtifact.getAddress(request.raw.currencyInfo.network!),
        value: getAmountToPay(request.raw).toString(),
        data: encodePayEthProxyRequest(request.raw),
      });
    }

    if (request.raw.currencyInfo.type === "BTC") {
      // TODO
      alert("not implemented");
      return;
    }

    if (request.raw.currencyInfo.type === "ISO4217") {
      // TODO
      alert("not implemented");
      return;
    }

    // send the transactions to the gnosis multisig
    appsSdk?.sendTransactions(txs);
  };

  const cancel = async () => {
    if (!request || !account || !chainId) {
      throw new Error("cannot cancel because page is not ready");
    }
    try {
      await cancelRequest(request.requestId, account, chainId);
    } catch (e) {
      if (!isCancelError(e)) {
      } else {
        throw e;
      }
    }
    await update();
  };

  if (!loading && !request) {
    return <RequestNotFound />;
  }
  return (
    <>
      <Box flex={1} borderRight="1px solid #E8E7E6;">
        <Header />
        <Body
          request={request}
          account={account}
          smartContractAddress={safeInfo?.safeAddress}
        />
      </Box>
      <Box flex={1}>
        <ActionsHeader />
        <Actions
          account={account || undefined}
          request={request}
          pay={pay}
          cancel={cancel}
          download={downloadReceipt}
          smartContractAddress={safeInfo?.safeAddress}
        />
      </Box>
    </>
  );
};

export default () => {
  const { chainId } = useWeb3React();

  return (
    <RequestProvider chainId={chainId}>
      <RequestPage />
    </RequestProvider>
  );
};
