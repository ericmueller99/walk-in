import {Header, Footer} from 'hollyburn-lib';
import Head from "next/head";

export default function Layout({children}) {
  return (
    <>
      <Head>
        <title>Hollyburn Properties - Walk-in</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Header showMenu={true} />
      <div className={"relative"}>
        {children}
      </div>
      <Footer />
    </>
  )
}