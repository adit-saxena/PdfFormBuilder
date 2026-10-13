import { redirect } from 'next/navigation';

// The AI assistant now lives in the editor's Agent tab.
export default function CreateWithAiPage() {
    redirect('/editor?mode=agent');
}
