#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAGEBOOK 部署前资源版本化（击穿 Cloudflare/CDN 陈旧缓存）。

问题背景：站点经 GitHub Pages + Cloudflare，静态资源（enhance.js 等）会被边缘节点
长期缓存；即使推送了新代码，用户浏览器仍可能拿到旧 JS，导致"线上报函数未定义 /
修好的 bug 还在"等诡异现象。给资源 URL 追加 ?v=<git短SHA> 后，URL 字面变化，
CDN 必须重新回源拉取，彻底规避陈旧缓存。

用法：
    python3 tools/bump_assets.py            # 用当前 HEAD 短 SHA 作为版本
    python3 tools/bump_assets.py abc1234    # 显式指定版本

幂等：已带 ?v= 的引用会被规范化到同一版本，不会重复叠加。
同时也同步更新 sw.js 的 CORE 列表（否则 PWA 离线壳会喂旧文件）并 bump 缓存版本。
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ASSET_RE = re.compile(
    r'(src|href)="(sagebook-(?:enhance|projects)\.(?:js|css))(\?v=[A-Za-z0-9_-]+)?"'
)
SW_CORE_RE = re.compile(r"('\./sagebook-(?:enhance|projects)\.(?:js|css))(\?v=[A-Za-z0-9_-]+)?'")
# sagebook-enhance.js 里注册 SW 的调用：register('./sw.js') -> register('./sw.js?v=VERSION')
SW_REGISTER_RE = re.compile(r"register\(\'\./sw\.js(\?v=[A-Za-z0-9_-]+)?\'\)")


def git_short_sha():
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT
        ).decode().strip()
        return out
    except Exception:
        return None


def main():
    version = sys.argv[1] if len(sys.argv) > 1 else git_short_sha()
    if not version:
        print("无法获取 git 短 SHA，请显式传入版本号：python3 bump_assets.py <version>")
        sys.exit(1)

    print("资源版本号：", version)

    html_files = []
    for name in os.listdir(ROOT):
        if name.endswith(".html"):
            html_files.append(os.path.join(ROOT, name))

    changed = 0
    for path in html_files:
        with open(path, "r", encoding="utf-8") as f:
            data = f.read()
        new_data, n = ASSET_RE.subn(
            lambda m: '{}="{}?v={}"'.format(m.group(1), m.group(2), version), data
        )
        if n:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_data)
            changed += 1
            print("  版本化 {} 处引用 -> {}".format(n, os.path.basename(path)))

    # sw.js：同步 CORE 资源版本，并 bump 缓存名
    sw_path = os.path.join(ROOT, "sw.js")
    if os.path.exists(sw_path):
        with open(sw_path, "r", encoding="utf-8") as f:
            sw = f.read()
        sw, n2 = SW_CORE_RE.subn(
            lambda m: "{}?v={}'".format(m.group(1), version), sw
        )
        # 缓存名直接绑定版本号（幂等）：sagebook-shell-<version>
        # 每次部署若资源变化，缓存名随版本变，旧缓存自然失效被清。
        sw, n3 = re.subn(
            r"const CACHE = 'sagebook-shell-[^']*'",
            "const CACHE = 'sagebook-shell-{}'".format(version),
            sw
        )
        with open(sw_path, "w", encoding="utf-8") as f:
            f.write(sw)
        if n2 or n3:
            changed += 1
            print("  sw.js：版本化 {} 处 CORE，缓存名 +1".format(n2))

    # sagebook-enhance.js：SW 注册也带版本，避免已装 PWA 被旧 SW 喂旧 JS
    enh_path = os.path.join(ROOT, "sagebook-enhance.js")
    if os.path.exists(enh_path):
        with open(enh_path, "r", encoding="utf-8") as f:
            enh = f.read()
        enh, n4 = SW_REGISTER_RE.subn(
            lambda m: "register('./sw.js?v={}')".format(version), enh
        )
        if n4:
            with open(enh_path, "w", encoding="utf-8") as f:
                f.write(enh)
            changed += 1
            print("  sagebook-enhance.js：SW 注册版本化 {} 处".format(n4))

    if changed:
        print("完成。记得 commit + push；用户只需硬刷新一次即可拿到新资源。")
    else:
        print("无需改动（资源已是最新版本）。")


if __name__ == "__main__":
    main()
