import { Suspense } from "react";
import RegistroClient from "./RegistroClient";

export const dynamic = "force-dynamic";

export default function RegistroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-fede-accent border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RegistroClient />
        </Suspense>
    );
}
