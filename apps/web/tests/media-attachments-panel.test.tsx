import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaAttachmentsPanel } from "@/components/MediaAttachmentsPanel";
import { prepareMediaAttachmentAction, validateMediaAttachmentAction } from "@/app/actions";
import { createClient } from "@/lib/supabase/browser";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/app/actions", () => ({
  deleteMediaAttachmentAction: vi.fn(),
  draftMediaAttachmentWithLoomAction: vi.fn(),
  prepareMediaAttachmentAction: vi.fn(),
  updateMediaAttachmentMetadataAction: vi.fn(),
  validateMediaAttachmentAction: vi.fn(),
  viewMediaAttachmentAction: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({ createClient: vi.fn() }));

describe("MediaAttachmentsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers, privately uploads, then validates a static image without an AI call", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({ storage: { from: vi.fn(() => ({ upload })) } } as never);
    vi.mocked(prepareMediaAttachmentAction).mockResolvedValue({
      ok: true,
      attachment: {
        id: "attachment-a",
        state: "uploading",
        bucket: "attachments",
        storage_path: "workspace-a/world-a/saga-a/images/attachment-a/original.png",
        replayed: false,
      },
    });
    vi.mocked(validateMediaAttachmentAction).mockResolvedValue({
      ok: true,
      result: { id: "attachment-a", state: "ready", duplicate: false },
    });

    render(<MediaAttachmentsPanel
      params={{ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" }}
      entityType="place"
      entityId="place-a"
      attachments={[]}
      readOnly={false}
    />);

    const image = new File([new Uint8Array(32)], "storm.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [image] } });
    fireEvent.change(screen.getByLabelText("Alt text"), { target: { value: "A bridge under green lightning" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload private image" }));

    await waitFor(() => expect(validateMediaAttachmentAction).toHaveBeenCalledOnce());
    expect(prepareMediaAttachmentAction).toHaveBeenCalledOnce();
    expect(upload).toHaveBeenCalledWith(
      "workspace-a/world-a/saga-a/images/attachment-a/original.png",
      image,
      { cacheControl: "60", contentType: "image/png", upsert: false },
    );
    expect(screen.getByText("Private image validated and linked. No AI or canon action ran.")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
