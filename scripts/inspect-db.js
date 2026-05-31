async function test() {
  try {
    const res = await fetch('https://data912.com/live/arg_corp');
    const data = await res.json();
    const ym34o = data.find(x => x.symbol === 'YM34O');
    const ym34d = data.find(x => x.symbol === 'YM34D');
    console.log('YM34O:', ym34o);
    console.log('YM34D:', ym34d);
  } catch (e) {
    console.error(e);
  }
}

test();
