import { PostingTemplateForm } from "@/components/posting-template-form";
import { getPostingTemplate } from "@/lib/gunbroker/posting-template";
import { getSession } from "@/lib/session";

export default async function DefaultsPage() {
  const session = await getSession();
  const template = await getPostingTemplate(session!.user.id);

  return (
    <div className="px-4 py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Defaults</p>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Shipping, payment, duration, condition, weight, and other GunBroker posting options used
        when you link WooCommerce products. Product fields come from WooCommerce when present;
        anything missing is filled from here.
      </p>
      <div className="mt-6 max-w-3xl">
        <PostingTemplateForm initial={template} />
      </div>
    </div>
  );
}
