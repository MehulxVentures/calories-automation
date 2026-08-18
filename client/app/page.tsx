import { requireSession } from "@/utils";
import { redirect } from "next/navigation";

const RootPage = async() => {
    const user = await requireSession();
    if(user.id) return redirect("/dashboard")
}

export default RootPage;