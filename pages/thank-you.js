import { ThankYou } from 'hollyburn-lib';
import React from 'react';
import {useRouter} from "next/router";
import AppContext from "../lib/appContext";

export default function Home() {

  const context = React.useContext(AppContext);
  const router = useRouter();

  React.useEffect(() => {
    if (context.session?.formCompleted === false) {
      router.push('/')
    }
  }, [context])

  const ThankYouMessage = () => {
    return (
        <>
          <span className="block">
            Thank you for filling out our Walk-in form!
          </span>
          <span className="block">
            Please check your email for a record of your Walk-in and instructions on how to submit an application to Hollyburn if you wish to apply.
          </span>
        </>
    )
  }

  return (
    <main>
      <ThankYou message={ThankYouMessage()} />
    </main>
  )
}