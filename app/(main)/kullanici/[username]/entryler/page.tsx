import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function KullaniciEntryler({ params }: Props) {
  const { username } = await params;
  redirect(`/kullanici/${username}`);
}
