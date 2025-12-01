import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyTokenDeploy", (m) => {
  const myTokenC = m.contract("MyToken", ["MyToken", "MT", 18, 100]);
  const TinyBankC = m.contract("TinyBank", [myTokenC]);
  m.call(myTokenC, "setManager", [TinyBankC]);

  return { myTokenC, TinyBankC };
});
