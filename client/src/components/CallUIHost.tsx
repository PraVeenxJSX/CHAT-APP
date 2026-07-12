import { useCall } from "../hooks/useCall";
import IncomingCallModal from "./IncomingCallModal";
import CallModal from "./CallModal";

const CallUIHost = () => {
  const { incoming, active } = useCall();
  return (
    <>
      {incoming && <IncomingCallModal />}
      {active && <CallModal />}
    </>
  );
};

export default CallUIHost;
