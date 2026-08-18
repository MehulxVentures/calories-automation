"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-chat";
import { useChatStore } from "@/store/chat-store";

export function ChatWorkspace() {
    const [draft, setDraft] = useState("");
    const activeId = useChatStore((state) => state.activeConversationId);
    const setActive = useChatStore((state) => state.setActiveConversation);
    const startNew = useChatStore((state) => state.startNewConversation);
    const conversations = useConversations();
    const messages = useMessages();
    const send = useSendMessage();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.data, send.isPending]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const value = draft.trim();
        if (!value || send.isPending) return;
        setDraft("");
        try {
            await send.mutateAsync(value);
        } catch {
            setDraft(value);
            toast.error("The agent could not respond. Please try again.");
        }
    }

    return (
        <div className="mx-auto flex h-[calc(100svh-7rem)] w-full max-w-6xl overflow-hidden rounded-2xl border bg-card shadow-sm">
            <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
                <div className="border-b p-3">
                    <Button className="w-full justify-start" variant="outline" onClick={startNew}>
                        <Plus className="size-4" /> New conversation
                    </Button>
                </div>
                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                        {conversations.data?.map((conversation) => (
                            <button
                                key={conversation.id}
                                onClick={() => setActive(conversation.id)}
                                className={cn(
                                    "w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-accent",
                                    activeId === conversation.id && "bg-accent text-accent-foreground",
                                )}
                            >
                                {conversation.title}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
                <ScrollArea className="flex-1">
                    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8 sm:px-8">
                        {!activeId && !send.isPending && (
                            <div className="m-auto max-w-md text-center">
                                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                    <Sparkles className="size-5" />
                                </div>
                                <h2 className="text-xl font-semibold">What did you eat today?</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Chat normally, or tell Nitro what you consumed. Calories are logged automatically.</p>
                            </div>
                        )}
                        <div className="mt-auto space-y-5">
                            {messages.data?.filter((message) => message.role !== "tool").map((message) => (
                                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                                    )}>
                                        {message.content}
                                    </div>
                                </div>
                            ))}
                            {send.isPending && (
                                <div className="flex justify-start"><div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Thinking…</div></div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </div>
                </ScrollArea>

                <form onSubmit={submit} className="border-t bg-background/90 p-3 backdrop-blur sm:p-4">
                    <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm">
                        <Textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    event.currentTarget.form?.requestSubmit();
                                }
                            }}
                            placeholder="Say hello or tell me what you ate…"
                            className="max-h-36 min-h-11 resize-none border-0 shadow-none focus-visible:ring-0"
                            rows={1}
                        />
                        <Button type="submit" size="icon" disabled={!draft.trim() || send.isPending} className="shrink-0 rounded-xl">
                            <Send className="size-4" /><span className="sr-only">Send</span>
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}
