import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewVision from "@/components/NewVision";

export default async function NewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/new");
  return (
    <main className="page">
      <h1>New vision</h1>
      <NewVision userId={user.id} />
    </main>
  );
}
