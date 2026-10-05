import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

const open = (search: string) => {
  window.history.pushState(null, '', `/${search}`);
  return render(<App />);
};

const input = () => screen.getByRole('textbox', { name: 'Write the equation after your next step' });
const devTools = () => screen.queryByRole('navigation', { name: 'Demo controls' });
const banner = () => screen.queryByRole('complementary', { name: 'Static demo preview' });

afterEach(() => window.history.pushState(null, '', '/'));

describe('static preview mode', () => {
  it('is clearly labelled as a static preview with a way back', () => {
    open('?state=01');
    const preview = within(banner()!);
    expect(preview.getByText('Static demo preview')).toBeInTheDocument();
    expect(preview.getByText(/Controls are not interactive\./)).toBeInTheDocument();
    expect(preview.getByRole('link', { name: 'Return to Live' })).toBeInTheDocument();
  });

  it('disables the fixture input and actions with native semantics', () => {
    open('?state=01');
    expect(input()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check step' })).toBeDisabled();
  });

  it('disables every action button in the other fixtures', () => {
    for (const id of ['03', '04', '05', '06']) {
      const { unmount } = open(`?state=${id}`);
      const learner = within(screen.getByRole('main'));
      for (const button of learner.getAllByRole('button')) expect(button).toBeDisabled();
      unmount();
    }
  });

  it('does not run any practice behaviour', async () => {
    const user = userEvent.setup();
    open('?state=02');
    const before = screen.getAllByRole('listitem').length;
    await user.type(input(), 'x + 2 = 6{Enter}');
    await user.click(screen.getByRole('button', { name: 'Check step' }));
    expect(input()).toHaveValue('');
    expect(screen.getAllByRole('listitem').length).toBe(before);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('returns to a clean live product from the banner', async () => {
    const user = userEvent.setup();
    open('?state=03');
    await user.click(screen.getByRole('link', { name: 'Return to Live' }));
    expect(banner()).not.toBeInTheDocument();
    expect(devTools()).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(input()).toBeEnabled();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
  });

  it('keeps the inspector choice when returning to live, but drops the dev tooling', async () => {
    const user = userEvent.setup();
    open('?state=06&inspector=1');
    await user.click(screen.getByRole('link', { name: 'Return to Live' }));
    expect(window.location.search).toBe('?inspector=1');
    expect(screen.getByRole('complementary', { name: 'Learning state inspector' })).toBeInTheDocument();
    expect(devTools()).not.toBeInTheDocument();
  });

  it('exposes the dev controls automatically, without dev=1', () => {
    open('?state=04');
    expect(devTools()).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
  });

  it('marks the active mode in the demo controls', async () => {
    const user = userEvent.setup();
    open('?dev=1');
    const controls = within(screen.getByRole('navigation', { name: 'Demo controls' }));
    expect(controls.getByRole('link', { name: 'Live' })).toHaveAttribute('aria-current', 'page');
    await user.click(controls.getByRole('link', { name: /^03 First misconception/ }));
    expect(controls.getByRole('link', { name: /^03 First misconception/ })).toHaveAttribute('aria-current', 'page');
    expect(controls.getByRole('link', { name: 'Live' })).not.toHaveAttribute('aria-current');
    expect(banner()).toBeInTheDocument();
  });
});

describe('static preview with the inspector query', () => {
  it('adds the inspector beside state 04, with the dev tooling and banner', () => {
    open('?state=04&inspector=1');
    expect(screen.getByRole('complementary', { name: 'Learning state inspector' })).toBeInTheDocument();
    expect(devTools()).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
    expect(input()).toBeDisabled();
  });

  it('does not invent inspector data for the other previews', () => {
    open('?state=01&inspector=1');
    expect(screen.queryByRole('complementary', { name: 'Learning state inspector' })).not.toBeInTheDocument();
  });
});

describe('live mode', () => {
  it('shows only the product at the root route', () => {
    const { container } = open('');
    expect(devTools()).not.toBeInTheDocument();
    expect(banner()).not.toBeInTheDocument();
    expect(screen.queryByText(/static demo preview|static previews/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Stepwise' })).toBeInTheDocument();
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it('adds only the dev navigation with dev=1', () => {
    open('?dev=1');
    const controls = within(devTools()!);
    expect(controls.getByRole('link', { name: 'Live' })).toHaveAttribute('aria-current', 'page');
    expect(banner()).not.toBeInTheDocument();
    expect(input()).toBeEnabled();
  });

  it('stays interactive with dev=1', async () => {
    const user = userEvent.setup();
    open('?dev=1');
    await user.type(input(), 'x + 2 = 6{Enter}');
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();
  });

  it('is interactive: the input is editable and Check step enables once there is text', async () => {
    const user = userEvent.setup();
    open('');
    expect(input()).toBeEnabled();
    const check = screen.getByRole('button', { name: 'Check step' });
    expect(check).toBeDisabled();
    await user.type(input(), 'x + 2 = 6');
    expect(check).toBeEnabled();
  });

  it('accepts a step from the live input', async () => {
    const user = userEvent.setup();
    open('');
    await user.type(input(), 'x + 2 = 6');
    await user.click(screen.getByRole('button', { name: 'Check step' }));
    const lines = within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('switches into a static preview and back through the demo controls', async () => {
    const user = userEvent.setup();
    open('?dev=1');
    await user.click(screen.getByRole('link', { name: /^02 Accepted/ }));
    expect(banner()).toBeInTheDocument();
    expect(window.location.search).toBe('?state=02');
    expect(input()).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Live' }));
    expect(banner()).not.toBeInTheDocument();
    expect(devTools()).toBeInTheDocument();
    expect(input()).toBeEnabled();
  });

  it('toggles the inspector from the dev controls', async () => {
    const user = userEvent.setup();
    open('?dev=1');
    expect(screen.queryByRole('complementary', { name: 'Learning state inspector' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Inspector on' }));
    expect(screen.getByRole('complementary', { name: 'Learning state inspector' })).toBeInTheDocument();
    expect(window.location.search).toBe('?dev=1&inspector=1');
    expect(devTools()).toBeInTheDocument();
  });

  it('shows the inspector from the query alone', () => {
    open('?inspector=1');
    expect(screen.getByRole('complementary', { name: 'Learning state inspector' })).toBeInTheDocument();
    expect(devTools()).not.toBeInTheDocument();
  });
});
