from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from omomodular.config import Config
from omomodular.presets import FACTORY_PRESETS, get_preset, list_presets, save_user_preset
from omomodular.server import create_app


@pytest.fixture
def temp_cfg(tmp_path):
    cfg = Config()
    cfg.config_dir = tmp_path / "omomodular"
    cfg.config_dir.mkdir(parents=True, exist_ok=True)
    cfg.patches_dir.mkdir(parents=True, exist_ok=True)
    return cfg


@pytest.fixture
def client(temp_cfg):
    app = create_app(temp_cfg)
    return TestClient(app)


def test_factory_presets_exist():
    assert "Deep Abyssal Drone" in FACTORY_PRESETS
    assert "Solar Flare FM" in FACTORY_PRESETS
    preset = get_preset("Deep Abyssal Drone", Path := None)  # type: ignore
    assert preset is not None
    assert len(preset["modules"]) >= 4
    assert len(preset["cables"]) >= 3


def test_user_preset_save_and_list(temp_cfg):
    dummy_patch = {"name": "Test Drone", "modules": [], "cables": []}
    save_user_preset("Test Drone", dummy_patch, temp_cfg.patches_dir)

    presets_list = list_presets(temp_cfg.patches_dir)
    names = [p["name"] for p in presets_list]
    assert "Test Drone" in names
    assert "Deep Abyssal Drone" in names


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["app"] == "OmoModular"


def test_api_presets(client):
    res = client.get("/api/presets")
    assert res.status_code == 200
    data = res.json()
    assert any(p["name"] == "Deep Abyssal Drone" for p in data)


def test_api_state_roundtrip(client):
    state = client.get("/api/state").json()
    assert "modules" in state

    state["test_key"] = "test_val"
    post_res = client.post("/api/state", json=state)
    assert post_res.status_code == 200

    new_state = client.get("/api/state").json()
    assert new_state.get("test_key") == "test_val"


def test_colossus_multi_row_preset():
    preset = FACTORY_PRESETS["★ The Colossus (3-Row Monster Rack)"]
    assert preset["rowCount"] == 3
    assert len(preset["modules"]) >= 10
    assert len(preset["cables"]) >= 8
    rows_present = {m.get("row", 0) for m in preset["modules"]}
    assert rows_present == {0, 1, 2}


def test_acid_techno_jam_preset():
    preset = FACTORY_PRESETS["★ 808 & 303 Acid Techno Jam"]
    assert preset["rowCount"] == 2
    assert len(preset["modules"]) >= 8
    assert len(preset["cables"]) >= 7
    # Verify kick, snare, hihat, acid modules exist
    types = {m["type"] for m in preset["modules"]}
    assert "percussion" in types
    assert "acid303" in types
    assert "mixer" in types


def test_api_midi_starters(client):
    res = client.get("/api/midi/starters")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3
    titles = [d["title"] for d in data]
    assert any("Acid" in t for t in titles)


def test_api_midi_download_starter(client):
    res = client.get("/api/midi/download?starter=Acid%20Techno%20303%20%26%20808.mid")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("audio/midi")
    assert res.content.startswith(b"MThd")


def test_api_midi_search(client):
    res = client.get("/api/midi/search?q=acid")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 1


def test_daft_modular_funk_preset():
    preset = FACTORY_PRESETS["★ Daft Modular Funk (MIDI Live)"]
    assert preset["rowCount"] == 2
    assert len(preset["modules"]) >= 7
    types = {m["type"] for m in preset["modules"]}
    assert "midi_player" in types
    assert "mixer" in types


def test_api_midi_single_track_filtering(client):
    res_single = client.get("/api/midi/starters?filter_type=single")
    assert res_single.status_code == 200
    singles = res_single.json()
    assert len(singles) >= 7
    assert all(item["is_single_track"] is True for item in singles)
    assert all(item["tracks_count"] == 1 for item in singles)

    res_multi = client.get("/api/midi/starters?filter_type=multi")
    assert res_multi.status_code == 200
    multis = res_multi.json()
    assert len(multis) >= 3
    assert all(item["is_single_track"] is False for item in multis)
    assert all(item["tracks_count"] > 1 for item in multis)


def test_api_midi_search_single_filter(client):
    res = client.get("/api/midi/search?q=riff&filter_type=single")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert all(item["is_single_track"] is True for item in data["results"])


def test_api_midi_starters_validity(client):
    res = client.get("/api/midi/starters")
    assert res.status_code == 200
    starters = res.json()
    assert len(starters) >= 15
    for s in starters:
        assert s["download_url"]
        dl = client.get(s["download_url"])
        assert dl.status_code == 200
        assert dl.content[:4] == b"MThd"


def test_euclidean_breakbeat_jam_preset():
    preset = FACTORY_PRESETS["★ Euclidean Breakbeat & Modular Sample Jam"]
    assert len(preset["modules"]) >= 8
    assert len(preset["cables"]) >= 8
    types = {m["type"] for m in preset["modules"]}
    assert "quad_euclid" in types
    assert "sample_player" in types
    assert "macro_percussion" in types
    assert "stochastic_vault" in types
    assert "wavetable_dual" in types
    assert "mixer" in types


def test_jungle_amen_acid_preset():
    preset = FACTORY_PRESETS["★ Jungle Amen Break & West-Coast Acid"]
    assert len(preset["modules"]) >= 6
    assert len(preset["cables"]) >= 5
    types = {m["type"] for m in preset["modules"]}
    assert "amen_slicer" in types
    assert "macro_percussion" in types
    assert "acid303" in types
    assert "mixer" in types


def test_tr_matrix_sidechain_preset():
    preset = FACTORY_PRESETS["★ TR-Matrix Drums & Ducking Sidechain Bass"]
    assert len(preset["modules"]) >= 8
    assert len(preset["cables"]) >= 9
    types = {m["type"] for m in preset["modules"]}
    assert "tr_matrix_seq" in types
    assert "sidechain_vca" in types
    assert "sample_player" in types
    assert "macro_percussion" in types
    assert "filter" in types
    assert "mixer" in types


def test_all_factory_presets_validity():
    for name, patch in FACTORY_PRESETS.items():
        assert "name" in patch
        assert "modules" in patch
        assert "cables" in patch
        module_ids = {m["id"] for m in patch["modules"]}
        for cable in patch["cables"]:
            assert cable["from"]["moduleId"] in module_ids, f"Broken cable from in {name}"
            assert cable["to"]["moduleId"] in module_ids, f"Broken cable to in {name}"


def test_api_sample_starters(client):
    res = client.get("/api/samples/starters")
    assert res.status_code == 200
    starters = res.json()
    assert len(starters) >= 10
    categories = {s["category"] for s in starters}
    assert "kick" in categories
    assert "snare" in categories
    assert "hihat" in categories
    assert "perc" in categories
    assert "break" in categories

    # Test category filtering
    kicks = client.get("/api/samples/starters?category=kick").json()
    assert len(kicks) >= 2
    assert all(k["category"] == "kick" for k in kicks)


def test_api_sample_download_starter(client):
    res = client.get("/api/samples/download?starter=909_Punch_Kick.wav")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("audio/wav")
    assert res.content.startswith(b"RIFF")


def test_api_sample_search(client):
    res = client.get("/api/samples/search?q=amen")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert any("Amen" in item["title"] for item in data["results"])


def test_api_sample_key_status(client):
    res = client.get("/api/samples/key")
    assert res.status_code == 200
    data = res.json()
    assert "has_key" in data


def test_freesound_key_saved_not_world_readable(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    app = create_app(Config(config_dir=tmp_path / "omomodular"))
    client = TestClient(app)
    res = client.post("/api/samples/key", json={"key": "secret-token"})
    assert res.status_code == 200

    key_file = tmp_path / ".config/omomodular/freesound_key.txt"
    assert key_file.is_file()
    mode = key_file.stat().st_mode & 0o777
    assert mode == 0o600, f"expected freesound_key.txt to be 0600, got {oct(mode)}"


# --- Adversarial / path-traversal tests -------------------------------------
# These target the two path-traversal bugs found in review: get_preset()/DELETE
# building `patches_dir / f"{name}.json"` directly from user input, and
# fetch_sample()'s `starter` param building `SAMPLE_DIR / starter` directly.
# Both are now sanitized via Path(name).name before use.

def test_get_preset_rejects_path_traversal(temp_cfg):
    # A name that would escape patches_dir if naively joined must not resolve
    # to anything outside it. Plant a sentinel file one level up to prove it.
    sentinel = temp_cfg.config_dir / "sentinel.json"
    sentinel.write_text('{"leaked": true}', "utf-8")

    result = get_preset("../sentinel", temp_cfg.patches_dir)
    assert result is None


def test_api_delete_preset_rejects_path_traversal(client, temp_cfg):
    # Starlette's default {name} path converter can't match "/" at all, so a
    # "../"-bearing name never reaches this route in practice (it 404s/405s
    # against the static-file catch-all instead). The sanitization in the
    # handler is still correct defense-in-depth; this test just confirms
    # traversal-shaped input never deletes anything outside patches_dir,
    # regardless of which layer stops it.
    sentinel = temp_cfg.config_dir / "sentinel.json"
    sentinel.write_text('{"leaked": true}', "utf-8")

    res = client.request("DELETE", "/api/presets/..%2Fsentinel")
    assert res.status_code in (404, 405)
    assert sentinel.is_file(), "traversal delete must not remove files outside patches_dir"


def test_api_sample_download_rejects_starter_path_traversal(client):
    res = client.get("/api/samples/download?starter=../../../../../../etc/passwd")
    assert res.status_code == 404


def test_api_sample_download_rejects_file_scheme(client):
    # fetch_sample's `url` param must be restricted to http(s); a file:// URI
    # must not be read off disk and served back.
    res = client.get("/api/samples/download?url=file:///etc/passwd&name=passwd.wav")
    assert res.status_code == 404


def test_api_midi_search_does_not_hit_network(client):
    # BitMidi search must not require live network access in tests.
    with patch("omomodular.midi_service.urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = AssertionError("test made a live network call")
        res = client.get("/api/midi/search?q=Acid Techno 303")
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert len(data["results"]) >= 1  # matched from local starter catalog





