import { Navbar } from "@/components/Navbar";

export default function ClienteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            <main className="min-h-screen pt-16">{children}</main>
        </>
    );
}
