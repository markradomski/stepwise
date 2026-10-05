import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeView } from './PracticeView';

const mistake = '3x + 2 = 18';

const setup = (showInspector = false) => {
  const user = userEvent.setup();
  render(<PracticeView showInspector={showInspector} />);
  const input = () => screen.getByRole('textbox', { name: 'Write the equation after your next step' });
  const submit = async (value: string) => {
    await user.clear(input());
    await user.type(input(), value);
    await user.click(screen.getByRole('button', { name: 'Check step' }));
  };
  const click = (name: string | RegExp) => user.click(screen.getByRole('button', { name }));
  const launcher = () => screen.getByRole('button', { name: /^(Need help\?|Help)$/ });
  const open = async () => {
    if (launcher().getAttribute('aria-expanded') === 'false') await user.click(launcher());
  };
  return { user, input, submit, click, launcher, open };
};

const surface = () => screen.getByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ });
const queryButton = (name: string | RegExp) => screen.queryByRole('button', { name });
const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
const forwardLabels = ['Get a hint', 'Show an example', 'Show next step'];
const forwardControls = () => [...forwardLabels, 'Need help?'].filter((name) => queryButton(name));
const priorControls = () => ['View prompt', 'View hint', 'View example'].filter((name) => queryButton(name));

describe('help launcher', () => {
  it('shows one Need help? launcher beside Check step and keeps Check step first', () => {
    const { launcher } = setup();
    const check = screen.getByRole('button', { name: 'Check step' });
    expect(screen.getAllByRole('button', { name: /help/i })).toHaveLength(1);
    expect(check.compareDocumentPosition(launcher()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(check.parentElement).toBe(launcher().parentElement);
    expect(check.className).not.toBe(launcher().className);
  });

  it('starts closed and describes its open state with aria-expanded and aria-controls', async () => {
    const { launcher, click } = setup();
    expect(launcher().tagName).toBe('BUTTON');
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('region', { name: 'Prompt' })).not.toBeInTheDocument();

    await click('Need help?');
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(launcher().getAttribute('aria-controls') as string)).toBe(surface());
  });

  it('shows the generic Prompt on a fresh state, without an example or next step', async () => {
    const { click, input } = setup();
    await click('Need help?');
    expect(within(surface()).getByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
    expect(within(surface()).getByText('Think about how you could make the equation simpler.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suggested next step')).not.toBeInTheDocument();
    expect(forwardControls().filter((name) => name !== 'Need help?')).toEqual([]);
    expect(input()).toBeInTheDocument();
  });

  it('does not open by itself when a misconception is diagnosed', async () => {
    const { submit, launcher } = setup();
    await submit(mistake);
    expect(screen.getByRole('status')).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ })).not.toBeInTheDocument();
  });

  it('offers Get a hint inside the surface for a known misconception, without marking it requested', async () => {
    const { submit, click } = setup(true);
    await submit(mistake);
    await click('Need help?');
    expect(within(surface()).getByRole('button', { name: 'Get a hint' })).toBeInTheDocument();
    expect(within(surface()).queryByText('The 3 applies to everything inside the brackets.')).not.toBeInTheDocument();
    expect(value('Hints requested')).toHaveTextContent('0');
    expect(value('Hint seen')).toHaveTextContent('No');
  });

  it('closes without resetting assistance or changing any metric', async () => {
    const { click, launcher } = setup(true);
    await click('Need help?');
    const metrics = ['Generic help requests', 'Hints requested', 'Examples requested', 'Mastery estimate'].map(
      (label) => value(label)?.textContent,
    );
    await click('Close help');
    expect(screen.queryByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ })).not.toBeInTheDocument();
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(value('Prompt seen')).toHaveTextContent('Yes');
    expect(launcher()).toHaveTextContent('Help');

    await click('Help');
    expect(within(surface()).getByText('Think about how you could make the equation simpler.')).toBeInTheDocument();
    const after = ['Generic help requests', 'Hints requested', 'Examples requested', 'Mastery estimate'].map(
      (label) => value(label)?.textContent,
    );
    expect(after).toEqual(metrics);
    expect(value('Generic help requests')).toHaveTextContent('1');
  });

  it('returns focus to the launcher on Close help and never traps focus', async () => {
    const { click, launcher, user, input } = setup();
    await click('Need help?');
    await click('Close help');
    expect(launcher()).toHaveFocus();
    await click('Help');
    await user.tab();
    expect(surface().contains(document.activeElement)).toBe(true);
    await user.click(input());
    expect(input()).toHaveFocus();
  });

  it('does not move focus into the help content when opening', async () => {
    const { click, launcher } = setup();
    await click('Need help?');
    expect(launcher()).toHaveFocus();
    expect(surface().contains(document.activeElement)).toBe(false);
  });

  it('closes the surface when a step is submitted', async () => {
    const { click, submit, launcher } = setup();
    await click('Need help?');
    await submit('3x + 6 = 18');
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).toHaveTextContent('Need help?');
  });
});

describe('forward action inside the surface', () => {
  it('climbs Get a hint, Show an example, Show next step with exactly one forward action each time', async () => {
    const { submit, click, open } = setup();
    await submit(mistake);
    await open();
    expect(forwardControls().filter((name) => name !== 'Need help?')).toEqual(['Get a hint']);

    await click('Get a hint');
    expect(within(surface()).getByRole('heading', { name: 'Hint' })).toBeInTheDocument();
    expect(within(surface()).getByText('The 3 applies to everything inside the brackets.')).toBeInTheDocument();
    expect(forwardControls().filter((name) => name !== 'Need help?')).toEqual(['Show an example']);

    await click('Show an example');
    expect(within(surface()).getByRole('heading', { name: 'Example' })).toBeInTheDocument();
    expect(within(surface()).getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    expect(within(surface()).queryByText('The 3 applies to everything inside the brackets.')).not.toBeInTheDocument();
    expect(forwardControls().filter((name) => name !== 'Need help?')).toEqual(['Show next step']);
  });

  it('keeps every forward action inside the surface, never beside Check step', async () => {
    const { submit, click, open } = setup();
    await submit(mistake);
    await open();
    await click('Get a hint');
    const check = screen.getByRole('button', { name: 'Check step' });
    const outside = [...check.parentElement!.querySelectorAll('button')].map((b) => b.textContent);
    expect(outside).toEqual(['Check step', 'Help']);
  });

  it('inserts the suggested next step, closes the surface and offers fresh help for the new state', async () => {
    const { submit, click, open, launcher, input } = setup(true);
    await submit(mistake);
    await open();
    await click('Get a hint');
    await click('Show an example');
    await click('Show next step');

    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).toHaveTextContent('Need help?');
    expect(value('Next-step reveals')).toHaveTextContent('1');
    expect(input()).toHaveFocus();
  });

  it('moves availability on after a repeated mistake without opening anything', async () => {
    const { submit, click, open, launcher } = setup();
    await submit(mistake);
    await open();
    await click('Get a hint');
    await submit(mistake);
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('The 3 applies to everything inside the brackets.')).not.toBeInTheDocument();
    await click('Help');
    expect(within(surface()).getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });
});

describe('reviewing prior support', () => {
  const toExample = async () => {
    const ctx = setup(true);
    await ctx.submit(mistake);
    await ctx.open();
    await ctx.click('Get a hint');
    await ctx.click('Show an example');
    return ctx;
  };

  it('shows no standalone View controls outside the surface', async () => {
    const { submit, click, open, launcher } = setup();
    await submit(mistake);
    await open();
    await click('Get a hint');
    await click('Show an example');
    expect(priorControls()).toEqual(['View hint']);
    expect(surface()).toContainElement(screen.getByRole('button', { name: 'View hint' }));
    await click('Close help');
    expect(priorControls()).toEqual([]);
    expect(launcher()).toBeInTheDocument();
  });

  it('offers exactly one prior-support action, with Example over Hint over Prompt', async () => {
    await toExample();
    expect(priorControls()).toEqual(['View hint']);
  });

  it('reviews the prior hint, keeps the forward action and returns cleanly to the example', async () => {
    const { click } = await toExample();
    await click('View hint');
    expect(within(surface()).getByRole('heading', { name: 'Hint' })).toBeInTheDocument();
    expect(within(surface()).getByText('The 3 applies to everything inside the brackets.')).toBeInTheDocument();
    expect(within(surface()).getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
    expect(forwardControls().filter((name) => name !== 'Need help?')).toEqual(['Show next step']);
    expect(priorControls()).toEqual([]);
    expect(within(surface()).getByRole('button', { name: 'Back to example' })).toBeInTheDocument();

    await click('Back to example');
    expect(within(surface()).getByRole('heading', { name: 'Example' })).toBeInTheDocument();
    expect(within(surface()).getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    expect(priorControls()).toEqual(['View hint']);
  });

  it('does not change metrics, mastery or escalation state when reviewing', async () => {
    const { click } = await toExample();
    const labels = ['Hints requested', 'Examples requested', 'Next-step reveals', 'Mastery estimate', 'Forward action'];
    const before = labels.map((label) => value(label)?.textContent);
    await click('View hint');
    await click('Back to example');
    await click('View hint');
    expect(labels.map((label) => value(label)?.textContent)).toEqual(before);
    expect(value('Forward action')).toHaveTextContent('Show next step');
  });

  it('shows no prior action while only the prompt has been seen', async () => {
    const { click } = setup();
    await click('Need help?');
    expect(priorControls()).toEqual([]);
    expect(queryButton(/^Back to/)).not.toBeInTheDocument();
  });
});

describe('help across steps and completion', () => {
  it('asks for new help on each step with that step’s own prompt', async () => {
    const { submit, click, launcher } = setup();
    await click('Need help?');
    await submit('3x + 6 = 18');
    expect(launcher()).toHaveTextContent('Need help?');
    await click('Need help?');
    expect(within(surface()).getByText('What operation would undo the +6?')).toBeInTheDocument();
  });

  it('keeps generic help available after an unrecognised step, without a diagnosis', async () => {
    const { submit, click } = setup();
    await submit('6 + 3x = 18');
    await click('Need help?');
    expect(within(surface()).getByText('Think about how you could make the equation simpler.')).toBeInTheDocument();
    expect(screen.queryByText(/Have another look/)).not.toBeInTheDocument();
  });

  it('shows no launcher or surface on a completed question and starts the next one closed', async () => {
    const { submit, click, launcher } = setup();
    await click('Need help?');
    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(screen.queryByRole('button', { name: /^(Need help\?|Help)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ })).not.toBeInTheDocument();
    expect(priorControls()).toEqual([]);

    await click('Next question');
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).toHaveTextContent('Need help?');
    await click('Need help?');
    expect(within(surface()).getByText('What operation would undo the +5?')).toBeInTheDocument();
  });

  it('shows no launcher when the practice is complete and starts closed after Practice again', async () => {
    const { submit, click, launcher } = setup();
    for (const steps of [['x + 2 = 6', 'x = 4'], ['2x = 12', 'x = 6'], ['x - 1 = 5', 'x = 6']]) {
      for (const step of steps) await submit(step);
      await click(/^(Next question|Practice again)$/);
    }
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).toHaveTextContent('Need help?');
  });

  it('never presents the help as AI, chat, a tutor or a level', async () => {
    const { submit, click, open } = setup();
    await click('Need help?');
    await submit(mistake);
    await open();
    await click('Get a hint');
    await click('Show an example');
    await click('Show next step');
    expect(
      within(screen.getByRole('main')).queryByText(
        /\b(ai|chat|tutor|assistant)\b|help level|hint level|assistance level|scaffold level|intervention level|escalation stage/i,
      ),
    ).toBeNull();
  });
});
