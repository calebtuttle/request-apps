import React from "react";
import Box from "@material-ui/core/Box";
import { RButton } from "request-ui";
// import MetamaskIcon from "../assets/img/metamask.png";
import SilkLogo from "../assets/silk-logo.svg";
import Dot from "./Dot";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
  button: {
    padding: "6px 8px",
    [theme.breakpoints.up("md")]: {
      padding: "6px 24px",
    },
  },
  icon: {
    display: "none",
    [theme.breakpoints.up("md")]: {
      display: "flex",
      alignItems: "center",
    },
  },
}));

const UserInfo = ({
  name,
  network,
  onClick,
}: {
  name: string;
  network?: number;
  onClick: () => void;
}) => {
  const classes = useStyles();
  const displayName =
    name.length <= 20 ? name : `${name.slice(0, 10)}...${name.slice(-10)}`;

  const CombinedIcon = () => {
    return (
      <Box className={classes.icon}>
        <Dot network={network} account={name} />
        <Box width={4} />
        <img alt="" src={SilkLogo} width={24} height={24} />
      </Box>
    );
  };
  return (
    <RButton
      color="default"
      startIcon={<CombinedIcon />}
      className={classes.button}
      onClick={onClick}
    >
      {displayName}
    </RButton>
  );
};

export default UserInfo;
