import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

const Factory = () => {
  const { mode } = useParams<{ mode?: string }>();

  return (
    <AppLayout
      initialModule="factory"
      initialFactoryMode={mode}
    />
  );
};

export default Factory;
