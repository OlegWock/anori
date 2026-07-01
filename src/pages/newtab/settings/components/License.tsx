import { css } from "styled-system/css";
import licenseText from "../../../../../LICENSE?raw";

const license = css({ "& p": { marginTop: "2" } });

const licenseParagraphs = licenseText.split("\n");

export const License = () => {
  return (
    <div className={license}>
      {licenseParagraphs.map((text, ind) => (
        <p key={ind}>{text}</p>
      ))}
    </div>
  );
};
