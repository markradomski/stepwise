import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeView } from '../practice/PracticeView';
import type { ExplanationProvider } from './explanationTypes';

const mistake = '3x + 2 = 18';

const setup = (explanationProvider?: ExplanationProvider) => {
  const user = userEvent.setup();
  render(<PracticeView showInspector explanationProvider={explanationProvider} />);
  const input = () => screen.getByRole('textbox', { name: 'Write the equation after your next step' });
  const submit = async (value: string) => {
    await user.clear(input());
    await user.type(input(), value);
    await user.click(screen.getByRole('button', { name: 'Check step' }));
  };
  const click = (name: string | RegExp) => user.click(screen.getByRole('button', { name }));
  const explainButtons = () => screen.queryAllByRole('button', { name: 'Explain this' });
  const explain = async (index = 0) => user.click(explainButtons()[index]);
  const openHelpFor = async (...names: string[]) => {
    await click('Need help?');
    for (const name of names) await click(name);
  };
  return { user, input, submit, click, explain, explainButtons, openHelpFor };
};

const region = () => screen.queryByRole('region', { name: 'Explanation' });
const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
const safeFallback = 'I can’t add a useful explanation for this yet.';
const always: Pick<ExplanationProvider, 'id' | 'label' | 'supports'> = { id: 'test', label: 'Test', supports: () => true };

describe('explain this', () => {
  it('appears only next to supported content', async () => {
    const { submit, explainButtons } = setup();
    expect(explainButtons()).toHaveLength(0);
    await submit('x = 4');
    expect(explainButtons()).toHaveLength(0);
    await submit('banana');
    expect(explainButtons()).toHaveLength(0);
    await submit('3x + 6 = 18');
    expect(explainButtons()).toHaveLength(1);
    await submit('3x = 12');
    await submit('x = 3');
    expect(explainButtons()).toHaveLength(1);
  });

  it('opens one explanation surface with a validated title and body, beside the content it explains', async () => {
    const { submit, explain } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    const surface = within(region()!);
    expect(surface.getByRole('heading', { name: 'Explanation' })).toBeInTheDocument();
    expect(surface.getByText('Why that step needs another look')).toBeInTheDocument();
    expect(surface.getByText(/the 3 multiplies x and 2, so expanding gives 3x \+ 6/)).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: 'Explanation' })).toHaveLength(1);
    const feedback = screen.getByText('Check what the 3 multiplies inside the brackets.');
    expect(feedback.compareDocumentPosition(region()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('explains an accepted step by the operation that kept it balanced', async () => {
    const { submit, explain, click } = setup();
    await submit('x + 2 = 6');
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent('Why that step works'));
    expect(region()).toHaveTextContent('Dividing both sides by 3 keeps the equation balanced and gives x + 2 = 6.');
    await click('Close explanation');
    await submit('x = 4');
    expect(region()).not.toBeInTheDocument();
  });

  it('explains a suggested next step that entered the working', async () => {
    const { submit, explain, openHelpFor } = setup();
    await submit(mistake);
    await openHelpFor('Get a hint', 'Show an example', 'Show next step');
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent('Why this step works'));
    expect(region()).toHaveTextContent('Multiplying the 3 by both x and 2 expands the brackets');
  });

  it('keeps the learner’s own equivalent wording and does not claim they typed the canonical form', async () => {
    const { submit, click, explain } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    await click('Next question');
    await submit('2x = 17 - 5');
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent('You wrote 2x = 17 - 5, which is equivalent to 2x = 12.'));
    expect(region()).not.toHaveTextContent('You wrote 2x = 12');
  });

  it('closes the previous explanation when another one opens', async () => {
    const { submit, explain, explainButtons, openHelpFor } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent('Why that step needs another look'));
    await openHelpFor('Get a hint');
    expect(explainButtons()).toHaveLength(2);
    await explain(1);
    await waitFor(() => expect(region()).toHaveTextContent('Why this hint helps'));
    expect(screen.getAllByRole('region', { name: 'Explanation' })).toHaveLength(1);
    expect(region()).not.toHaveTextContent('Why that step needs another look');
  });

  it('closes with Close explanation and returns focus to Explain this', async () => {
    const { submit, explain, click } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await click('Close explanation');
    expect(region()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explain this' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Explain this' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles from the same Explain this control', async () => {
    const { submit, explain } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await explain();
    expect(region()).not.toBeInTheDocument();
  });
});

describe('explanation is informational only', () => {
  it('changes no attempts, assistance, help metrics, mastery or progress', async () => {
    const { submit, explain } = setup();
    await submit(mistake);
    const labels = [
      'Attempt',
      'Forward action',
      'Current support',
      'Hint seen',
      'Generic help requests',
      'Hints requested',
      'Examples requested',
      'Next-step reveals',
      'Mastery estimate',
      'Repeated misconception count',
      'Completed',
    ];
    const before = labels.map((label) => value(label)?.textContent);
    const steps = screen.getAllByRole('listitem').length;
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(labels.map((label) => value(label)?.textContent)).toEqual(before);
    expect(screen.getAllByRole('listitem').length).toBe(steps);
    expect(value('Explanations requested')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Need help?' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not trigger help escalation or a Get a hint request', async () => {
    const { submit, explain } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Get a hint|Show an example|Show next step/ })).not.toBeInTheDocument();
    expect(value('Hint seen')).toHaveTextContent('No');
  });
});

describe('explanation failures', () => {
  it('shows a safe fallback when the provider reports it is unavailable', async () => {
    const { submit, explain } = setup({ ...always, explain: async () => ({ status: 'unavailable' }) });
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent(safeFallback));
    expect(value('Status')).toHaveTextContent('unavailable');
  });

  it('shows the same fallback, with no technical detail, when the provider throws', async () => {
    const { submit, explain } = setup({
      ...always,
      explain: async () => {
        throw new Error('socket hang up');
      },
    });
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent(safeFallback));
    expect(screen.queryByText(/socket|error/i, { selector: 'main *' })).not.toBeInTheDocument();
    expect(value('Status')).toHaveTextContent('error');
  });

  it('never renders output that fails validation', async () => {
    const { submit, explain } = setup({
      ...always,
      explain: async () => ({ status: 'ok', value: { version: 'explanation-output/1', title: 'T', body: 'B', isCorrect: true } }),
    });
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toHaveTextContent(safeFallback));
    expect(region()).not.toHaveTextContent('B');
  });

  it('shows a minimal loading state while the provider is pending', async () => {
    let resolve: (value: { status: 'unavailable' }) => void = () => undefined;
    const { submit, explain } = setup({ ...always, explain: () => new Promise((r) => (resolve = r)) });
    await submit(mistake);
    await explain();
    expect(region()).toHaveTextContent('Explaining…');
    resolve({ status: 'unavailable' });
    await waitFor(() => expect(region()).toHaveTextContent(safeFallback));
  });

  it('ignores a slow answer for an explanation that was closed in the meantime', async () => {
    let resolve: (value: { status: 'unavailable' }) => void = () => undefined;
    const { submit, explain, click } = setup({ ...always, explain: () => new Promise((r) => (resolve = r)) });
    await submit(mistake);
    await explain();
    await click('Close explanation');
    resolve({ status: 'unavailable' });
    await Promise.resolve();
    expect(region()).not.toBeInTheDocument();
  });
});

describe('explanation lifetime', () => {
  it('is gone when a step is submitted, when the question completes and on the next question', async () => {
    const { submit, click, explain } = setup();
    await submit('x + 2 = 6');
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await submit('x = 4');
    expect(region()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explain this' })).not.toBeInTheDocument();
    expect(screen.getByText('Question complete')).toBeInTheDocument();

    await click('Next question');
    expect(region()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explain this' })).not.toBeInTheDocument();
  });

  it('is cleared by Practice again', async () => {
    const { submit, click, explain } = setup();
    for (const steps of [['x + 2 = 6', 'x = 4'], ['2x = 12', 'x = 6'], ['x - 1 = 5']]) {
      for (const step of steps) await submit(step);
      if (steps.length === 2) await click('Next question');
    }
    await explain().catch(() => undefined);
    await submit('x = 6');
    await click('Practice again');
    expect(region()).not.toBeInTheDocument();
    expect(value('Explanations requested')).toHaveTextContent('0');
  });

  it('counts a target once per question however often it is reopened, and keeps the total across questions', async () => {
    const { submit, click, explain } = setup();
    await submit('x + 2 = 6');
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await click('Close explanation');
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(value('Explanations requested')).toHaveTextContent('1');
    await click('Close explanation');
    await submit('x = 4');
    await click('Next question');
    await submit('2x = 12');
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(value('Explanations requested')).toHaveTextContent('2');
  });

  it('never presents itself as AI, a model or a chat', async () => {
    const { submit, explain, openHelpFor } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await openHelpFor('Get a hint');
    expect(within(screen.getByRole('main')).queryByText(/\b(ai|llm|model|prompt engineering|chat|tutor|assistant)\b/i)).toBeNull();
  });
});

describe('explanation accessibility', () => {
  it('is a real button with aria-expanded and aria-controls pointing at the surface', async () => {
    const { submit, explain } = setup();
    await submit(mistake);
    const button = screen.getByRole('button', { name: 'Explain this' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-controls');
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBe(region());
  });

  it('does not move focus into the explanation and does not trap focus', async () => {
    const { submit, explain, input, user } = setup();
    await submit(mistake);
    const button = screen.getByRole('button', { name: 'Explain this' });
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(region()!.contains(document.activeElement)).toBe(false);
    expect(button).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close explanation' })).toHaveFocus();
    await user.click(input());
    expect(input()).toHaveFocus();
  });

  it('keeps the explanation next to its source in reading order and apart from the help surface', async () => {
    const { submit, explain, openHelpFor, input } = setup();
    await submit(mistake);
    await explain();
    await waitFor(() => expect(region()).toBeInTheDocument());
    await openHelpFor('Get a hint');
    expect(region()!.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Hint' }).contains(region())).toBe(false);
  });
});
