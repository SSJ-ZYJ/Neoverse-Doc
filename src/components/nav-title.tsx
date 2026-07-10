// Navbar brand title rendered by fumadocs BaseLayout.
// Previously lived in the transition/ directory and captured a snapshot when
// leaving docs for the homepage; that direction now uses page-enter (blur)
// via the asymmetric isCrossRouteGroupTransition rule, so snapshot capture is
// no longer needed. Moved here as a plain presentational component.
// fumadocs 基础布局渲染的导航栏品牌标题。
// 原先位于 transition/ 目录，在从 docs 返回首页时捕获过渡快照；该方向现已
// 通过不对称的 isCrossRouteGroupTransition 规则改用 page-enter（模糊），
// 不再需要捕获快照。作为纯展示组件移至当前目录。
export function NavTitle() {
  return <span className="font-orbitron font-bold text-xl tracking-wider">Neoverse-Doc</span>;
}
