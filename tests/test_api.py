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




