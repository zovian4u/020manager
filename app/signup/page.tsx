import { SignUp } from "@stackframe/stack";

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-pink-50/50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-xl italic">020</div>
                <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Join Alliance 020</h1>
            </div>
            {/* ✅ Removed 'routing' to fix TS error */}
            <SignUp fullPage={true} />
        </div>
    );
}