"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Plus, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
    const sendingRef = useRef(false);
    const visibleMessages = useMemo(() => {
        return (messages.data ?? []).filter((message, index, all) => {
            if (message.role === "tool") return false;
            const previous = all[index - 1];
            if (!previous || previous.role !== message.role || previous.content !== message.content) return true;
            return new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > 5000;
        });
    }, [messages.data]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.data, send.isPending]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const value = draft.trim();
        if (!value || send.isPending || sendingRef.current) return;
        sendingRef.current = true;
        setDraft("");
        try {
            await send.mutateAsync(value);
        } catch {
            setDraft(value);
            toast.error("The agent could not respond. Please try again.");
        } finally {
            sendingRef.current = false;
        }
    }

    return (
        <div className="mx-auto flex h-full min-h-[36rem] w-full max-w-7xl overflow-hidden rounded-2xl border bg-card shadow-sm">
            <aside className="hidden w-64 shrink-0 border-r bg-muted/20 md:flex md:flex-col">
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
                        {conversations.isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading conversations…</p>}
                        {!conversations.isLoading && conversations.data?.length === 0 && <p className="px-3 py-8 text-center text-xs text-muted-foreground">Your conversations will appear here.</p>}
                    </div>
                </ScrollArea>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><MessageCircle className="size-4" /></span>
                        <div><p className="text-sm font-semibold">Uli agent</p><p className="text-[10px] text-muted-foreground">Chat naturally · calories save automatically</p></div>
                    </div>
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={startNew}><Plus className="size-4" /> New</Button>
                </header>
                <ScrollArea className="min-h-0 flex-1">
                    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-8">
                        {!activeId && !send.isPending && (
                            <div className="m-auto max-w-md text-center">
                                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                    <Sparkles className="size-5" />
                                </div>
                                <h2 className="text-xl font-semibold">What did you eat today?</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Chat normally, or tell Uli what you consumed. Calories are logged automatically.</p>
                            </div>
                        )}
                        <div className="mt-auto space-y-4">
                            {visibleMessages.map((message) => (
                                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%]",
                                        message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-muted/60",
                                    )}>
                                        {message.role === "assistant" ? (
                                            <ReactMarkdown components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                                                ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                                            }}>{message.content}</ReactMarkdown>
                                        ) : <p className="whitespace-pre-wrap">{message.content}</p>}
                                        <p className={cn("mt-1 text-[9px] opacity-55", message.role === "user" && "text-right")}>
                                            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
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

                <form onSubmit={submit} className="shrink-0 border-t bg-background/90 p-3 backdrop-blur sm:p-4">
                    <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-muted/20 p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
                        <Textarea
                            value={draft}
                            disabled={send.isPending}
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
