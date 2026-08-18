import { LoginForm } from "@/components/modules/authentication/login-form"
import Image from "next/image"

export default function Auth03() {
    return (
        <div className="flex rounded-[26px] items-cente justify-center min-h-svh p-2 bg-zinc-50 dark:bg-zinc-950">
            <div className="flex w-full max-h-fit overflow-hidden bg-background">


                <div className="relative w-full bg-zinc-100">
                    <Image
                        src="/image/auth/auth.png"
                        alt="Authentication Background"
                        width={20}
                        height={20}
                        unoptimized
                        className="object-cover w-full h-full"
                    />

                    <div className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-background absolute top-2.5 right-2.5 bottom-2.5 z-10 w-1/2">
                        <div className="w-full max-w-[380px]">
                            <LoginForm />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}