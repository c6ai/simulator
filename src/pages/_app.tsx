import Layout from "@/components/Layout";
import StatusBar from "@/components/StatusBar";
import { METADATA } from "@/lib/constants";
import type { CacheStore } from "@/stores/cacheStore";
import { useCacheStore } from "@/stores/cacheStore";
import "@/styles/globals.css";
import type { AppContext, AppProps } from "next/app";
import { Rubik, Sora } from "next/font/google";
import Head from "next/head";
import Script from "next/script";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useMediaQuery } from "usehooks-ts";

// Must be loaded after global styles
import { checkCache, retryDownload } from "@/lib/utils";

const sora = Sora({
  subsets: ["latin"],
  style: ["normal"],
  weight: ["400", "600", "700"],
});

const rubik = Rubik({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const getStore = (store: CacheStore) => ({
  complete: store.complete,
  setComplete: store.setComplete,
});

export default function App({
  Component,
  pageProps,
}: AppProps<{ nonce: string }>) {
  const isMobile = useMediaQuery("(max-width: 499px)");
  const { setComplete } = useCacheStore(getStore);

  // Listen for service worker to complete semaphore downloads
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data === "CACHE_COMPLETE") {
          setComplete(true);
        }
      });
    }
  }, [setComplete]);

  // Check if semaphore files already exist in cache
  useEffect(() => {
    async function checkSemaphoreCache() {
      if (await checkCache()) {
        setComplete(true);
      } else {
        await retryDownload();
      }
    }

    void checkSemaphoreCache();
  }, [setComplete]);

  return (
    <>
      <Head>
        <title>{METADATA.name}</title>
        <meta
          name="description"
          content={METADATA.description}
        />

        <link
          rel="manifest"
          href="/favicon/site.webmanifest"
        />
        <link
          rel="mask-icon"
          href="/favicon/safari-pinned-tab.svg"
          color="#191919"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
      </Head>

      <Layout>
        <StatusBar />
        <Component {...pageProps} />
      </Layout>

      <Toaster position={isMobile ? "top-center" : "top-right"} />
      <style
        jsx
        global
      >{`
        :root {
          --font-sora: ${sora.style.fontFamily};
          --font-rubik: ${rubik.style.fontFamily};
        }
      `}</style>
      <Script
        id="sw"
        nonce={pageProps.nonce}
      >
        {`
          if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
            window.addEventListener("load", function() {
              navigator.serviceWorker.register("/sw.js").catch(function(error) {
                console.error("Error during service worker registration:", error);
              });
            });
          }
        `}
      </Script>
    </>
  );
}

App.getInitialProps = async (appContext: AppContext) => ({
  pageProps: {
    nonce: appContext.ctx.req?.headers["x-nonce"] as string,
  },
});
