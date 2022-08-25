import '../styles/globals.css'
import Layout from "./components/layout";
import AppContext from "../lib/appContext";
import {useState} from "react";

function MyApp({ Component, pageProps }) {
  const [session, setSession] = useState({formCompleted: false});
  return (
    <AppContext.Provider value={{session, setSession}}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContext.Provider>
  )
}

export default MyApp