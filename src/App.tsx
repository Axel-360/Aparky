import { useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";

function App() {
  const [count, setCount] = useState(0);

  return (
    <Button className="hover:cursor-pointer" variant="destructive" onClick={() => setCount(count + 1)}>
      count is {count}
    </Button>
  );
}

export default App;
